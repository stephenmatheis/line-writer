import { ChangeEvent, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { noteContent, saveNote } from '@/lib/notes';
import { useFont } from '@/providers/font-provider';
import styles from './editor.module.scss';

export function Editor({ noteId }: { noteId: string }) {
    const { font, fontSize, lineHeight, width } = useFont();
    const [content, setContent] = useState(noteContent(noteId));
    const [cursorPos, setCursorPos] = useState(content.length);
    const [focusRange, setFocusRange] = useState({ start: 0, end: 0 });
    const editorRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    function handleInput(event: ChangeEvent<HTMLTextAreaElement>) {
        const newText = event.target.value;

        saveNote(noteId, newText);

        setContent(newText);
        setCursorPos(event.target.selectionStart || 0);
    }

    function resize(node: HTMLElement) {
        node.style.height = 'auto';
        node.style.height = `${node.scrollHeight}px`;
    }

    function measureCaretLine(textArea: HTMLTextAreaElement, text: string, caret: number) {
        const cs = getComputedStyle(textArea);
        const lineHeight = parseFloat(cs.lineHeight);
        const mirror = document.createElement('div');

        mirror.style.position = 'absolute';
        mirror.style.visibility = 'hidden';
        mirror.style.boxSizing = 'border-box';
        mirror.style.width = `${textArea.getBoundingClientRect().width}px`;
        mirror.style.fontFamily = cs.fontFamily;
        mirror.style.fontSize = cs.fontSize;
        mirror.style.lineHeight = cs.lineHeight;
        mirror.style.whiteSpace = 'pre-wrap';
        mirror.style.overflowWrap = 'break-word';

        const textNode = document.createTextNode(text + '\u200b');

        mirror.appendChild(textNode);
        document.body.appendChild(mirror);

        const range = document.createRange();

        range.setStart(textNode, 0);
        range.setEnd(textNode, text.length + 1);

        const rowTops: number[] = [];

        for (const rect of range.getClientRects()) {
            if (!rowTops.some((top) => Math.abs(top - rect.top) < lineHeight / 2)) {
                rowTops.push(rect.top);
            }
        }

        rowTops.sort((a, b) => a - b);

        function lineOfChar(i: number) {
            range.setStart(textNode, i);
            range.setEnd(textNode, i + 1);

            const top = range.getBoundingClientRect().top;
            let closest = 0;

            for (let line = 1; line < rowTops.length; line++) {
                if (Math.abs(rowTops[line] - top) < Math.abs(rowTops[closest] - top)) {
                    closest = line;
                }
            }

            return closest;
        }

        function firstCharAtOrAfterLine(line: number) {
            let low = 0;
            let high = text.length;

            while (low < high) {
                const mid = (low + high) >> 1;

                if (lineOfChar(mid) >= line) {
                    high = mid;
                } else {
                    low = mid + 1;
                }
            }

            return low;
        }

        const caretLine = caret === 0 ? 0 : lineOfChar(caret - 1) + (text[caret - 1] === '\n' ? 1 : 0);
        const lineStart = firstCharAtOrAfterLine(caretLine);
        const lineEnd = firstCharAtOrAfterLine(caretLine + 1);

        mirror.remove();

        return { caretLine, lineStart, lineEnd, lineHeight };
    }

    function scrollCaretLineToCenter(textArea: HTMLTextAreaElement, caretLine: number, lineHeight: number) {
        const caretLineCenter =
            textArea.getBoundingClientRect().top + window.scrollY + caretLine * lineHeight + lineHeight / 2;

        window.scrollTo({
            top: caretLineCenter - window.innerHeight / 2,
            behavior: 'auto',
        });
    }

    useLayoutEffect(() => {
        if (!textAreaRef.current) return;

        resize(textAreaRef.current);

        const { caretLine, lineStart, lineEnd, lineHeight } = measureCaretLine(textAreaRef.current, content, cursorPos);

        scrollCaretLineToCenter(textAreaRef.current, caretLine, lineHeight);

        setFocusRange((prev) =>
            prev.start === lineStart && prev.end === lineEnd ? prev : { start: lineStart, end: lineEnd },
        );
    }, [content, cursorPos, font, fontSize, lineHeight, width]);

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.style.opacity = '1';
        }

        window.addEventListener('click', focus);

        const end = textAreaRef.current?.value.length ?? 0;

        textAreaRef.current?.setSelectionRange(end, end);

        function focus(event: Event) {
            if (document.querySelector('[data-no-refocus]')) return;
            if (document.activeElement === textAreaRef.current) return;

            if (textAreaRef.current && !textAreaRef.current.contains(event.target as Node)) {
                window.getSelection?.()?.removeAllRanges();
            }

            textAreaRef.current?.focus();
        }

        return () => {
            window.removeEventListener('click', focus);
        };
    }, []);

    return (
        <div ref={editorRef} className={styles.editor} style={{ opacity: '0' }}>
            <div className={styles.overlay} aria-hidden="true">
                {content.slice(0, focusRange.start)}
                <span>{content.slice(focusRange.start, focusRange.end)}</span>
                {content.slice(focusRange.end)}
            </div>
            <textarea
                ref={textAreaRef}
                value={content}
                onChange={handleInput}
                autoFocus={true}
                rows={1}
                spellCheck={false}
                id="editor"
            />

            <div className={styles.bar} />
        </div>
    );
}
