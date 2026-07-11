import { ChangeEvent, useState, useRef, useEffect, useLayoutEffect, Fragment } from 'react';
import styles from './editor.module.scss';

export function Editor() {
    const [content, setContent] = useState(localStorage.getItem('note') || '');
    const [cursorPos, setCursorPos] = useState(content.length);
    const editorRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    function handleInput(event: ChangeEvent<HTMLTextAreaElement>) {
        const newText = event.target.value;

        localStorage.setItem('note', newText);

        setContent(newText);
        setCursorPos(event.target.selectionStart || 0);
    }

    function resize(node: HTMLElement) {
        node.style.height = 'auto';
        node.style.height = `${node.scrollHeight}px`;
    }

    function highlightText(text: string) {
        const sentenceRegex = /([^.!?]+[.!?])/g;
        const sentences = text.match(sentenceRegex) || [];
        const lastSentence = text.slice(sentences.join('').length);

        return (
            <>
                {sentences.map((sentence, index) => (
                    <Fragment key={index}>{sentence}</Fragment>
                ))}
                {lastSentence && <span>{lastSentence}</span>}
            </>
        );
    }

    function scrollCaretLineToCenter(textArea: HTMLTextAreaElement, caret: number) {
        const cs = getComputedStyle(textArea);
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
        mirror.textContent = textArea.value.slice(0, caret);

        const marker = document.createElement('span');

        marker.textContent = '​';
        mirror.appendChild(marker);
        document.body.appendChild(mirror);

        // glyph height is not line height - get top of line glyph is in
        const lineHeight = parseFloat(cs.lineHeight);
        const caretLine = Math.round(marker.offsetTop / lineHeight);

        mirror.remove();

        const caretLineCenter =
            textArea.getBoundingClientRect().top + window.scrollY + caretLine * lineHeight + lineHeight / 2;

        window.scrollTo({
            top: caretLineCenter - window.innerHeight / 2,
        });
    }

    useLayoutEffect(() => {
        if (textAreaRef.current) {
            resize(textAreaRef.current);
            scrollCaretLineToCenter(textAreaRef.current, cursorPos);
        }
    }, [content, cursorPos]);

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.style.opacity = '1';
        }

        // FIXME: Scrolls on mobile when clicking menu
        window.addEventListener('click', focus);

        function focus(event: Event) {
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
                {highlightText(content)}
            </div>
            <textarea
                ref={textAreaRef}
                value={content}
                onChange={handleInput}
                // autoFocus
                rows={1}
                spellCheck={false}
                id="editor"
            />

            <div className={styles.bar} />
        </div>
    );
}

export default Editor;
