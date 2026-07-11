import { ChangeEvent, useState, useRef, useEffect, useLayoutEffect, Fragment } from 'react';
import styles from './editor.module.scss';

export function Editor() {
    const [content, setContent] = useState(localStorage.getItem('note') || '');
    const [cursorPos, setCursorPos] = useState(0);
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

    function scrollBodyToBottom() {
        // console.log('SCROLL. Document scroll height:', document.documentElement.scrollHeight);

        window.scrollTo({
            top: document.documentElement.scrollHeight,
        });
    }

    // Resize and recenter before paint on every content change, no matter how
    // it happened: typing, Enter, paste, or the initial mount.
    useLayoutEffect(() => {
        if (textAreaRef.current) {
            resize(textAreaRef.current);
        }

        scrollBodyToBottom();
    }, [content]);

    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.setSelectionRange(textAreaRef.current.value.length, textAreaRef.current.value.length);
        }

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
