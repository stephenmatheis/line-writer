// https://chatgpt.com/share/ee4b1b02-bc03-46cf-bc2c-6c943f386782

import { ChangeEvent, ClipboardEvent, useState, useRef, useEffect, Fragment } from 'react';
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
        resize(event.target);
    }

    function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
        event.preventDefault();

        const plainText = event.clipboardData.getData('text/plain');
        const target = event.target as HTMLTextAreaElement;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const newContent = content.slice(0, start) + plainText + content.slice(end);

        localStorage.setItem('note', newContent);

        setContent(newContent);

        setTimeout(() => {
            target.setSelectionRange(start + plainText.length, start + plainText.length);

            resize(event.target as HTMLElement);

            scrollBodyToBottom();
        }, 0);
    }

    function resize(node: HTMLElement) {
        // scrollHeight never reports smaller than the current box, so reset to
        // auto first or the height can only ever grow
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

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (!textAreaRef.current) return;

            textAreaRef.current.setSelectionRange(textAreaRef.current.value.length, textAreaRef.current.value.length);

            console.log('here');
            resize(textAreaRef.current);

            scrollBodyToBottom();
        }, 0);

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

            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, []);

    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.selectionStart = cursorPos;
            textAreaRef.current.selectionEnd = cursorPos;
        }
    }, [cursorPos]);

    useEffect(() => {
        const chars = window.innerWidth < 404 ? 35 : window.innerWidth < 700 ? 40 : 20;

        if (content.length <= chars) {
            return;
        }

        scrollBodyToBottom();
    }, [content]);

    return (
        <div ref={editorRef} className={styles.editor} style={{ opacity: '0' }}>
            <div className={styles.overlay} aria-hidden="true">
                {highlightText(content)}
            </div>
            <textarea
                ref={textAreaRef}
                value={content}
                onChange={handleInput}
                onPaste={handlePaste}
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
