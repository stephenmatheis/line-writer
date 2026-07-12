import { ChangeEvent, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { noteContent, saveNote } from '@/lib/notes';
import { useFont } from '@/providers/font-provider';
import styles from './editor.module.scss';

// One editor edits one note. The app remounts it (key={noteId}) when the
// active note changes, so all the state below starts over from storage.
export function Editor({ noteId }: { noteId: string }) {
    const { font, fontSize } = useFont();
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
        mirror.style.width = `${textArea.clientWidth}px`;
        mirror.style.fontFamily = cs.fontFamily;
        mirror.style.fontSize = cs.fontSize;
        mirror.style.lineHeight = cs.lineHeight;
        mirror.style.whiteSpace = 'pre-wrap';
        mirror.style.overflowWrap = 'break-word';

        // textarea displays an empty last line if the last char is a newline
        // add a zero-width space (u200b) to force that line to exist
        const textNode = document.createTextNode(text + '\u200b');

        mirror.appendChild(textNode);
        document.body.appendChild(mirror);

        const mirrorTop = mirror.getBoundingClientRect().top;
        const range = document.createRange();

        // Get visual line of the character at index i. A newline's rect sits at
        // the end of the line it terminates, which is the line it belongs to.
        // The rect top is the top of the glyph box, which floats half-leading
        // below the top of the full line box, so divide by line height and
        // round to snap to a clean line index.
        function lineOfChar(i: number) {
            range.setStart(textNode, i);
            range.setEnd(textNode, i + 1);

            return Math.round((range.getBoundingClientRect().top - mirrorTop) / lineHeight);
        }

        // First index whose character sits on `line` or later. Walking
        // forward through the text, line numbers only ever go up - so the
        // string behaves like a sorted list and binary search works.
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

        // A caret sits between characters, so which line is it on? The line
        // of the character just behind it - unless that character is a
        // newline (Enter was just pressed), which puts the caret on the
        // fresh line below it.
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
        // font and fontSize matter here too: changing either moves every wrap
        // point and the ch-based width, so everything needs measuring again
    }, [content, cursorPos, font, fontSize]);

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.style.opacity = '1';
        }

        // FIXME: Scrolls on mobile when clicking menu
        window.addEventListener('click', focus);

        function focus(event: Event) {
            // other UI (command palette, future modals) opts out of the
            // always-refocus-the-editor behavior with this attribute
            if (event.target instanceof Element && event.target.closest('[data-no-refocus]')) {
                return;
            }

            if (textAreaRef.current && !textAreaRef.current.contains(event.target as Node)) {
                if (window.getSelection) {
                    window.getSelection()?.removeAllRanges();
                }
            }

            textAreaRef.current?.focus();
        }

        return () => {
            window.removeEventListener('click', focus);
        };
    }, []);

    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.selectionStart = cursorPos;
            textAreaRef.current.selectionEnd = cursorPos;
        }
    }, [cursorPos]);

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
                autoFocus
                rows={1}
                spellCheck={false}
                id="editor"
            />

            <div className={styles.bar} />
        </div>
    );
}

export default Editor;
