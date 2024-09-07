// https://chatgpt.com/share/ee4b1b02-bc03-46cf-bc2c-6c943f386782

import {
    ChangeEvent,
    ClipboardEvent,
    useState,
    useRef,
    useEffect,
    Fragment,
} from 'react';
import { StatusBar } from '@/components/statusbar';
import styles from './editor.module.scss';

const chars = 70;
const width = `${chars}ch`;

export function Editor() {
    const [content, setContent] = useState(localStorage.getItem('note') || '');
    const [cursorPos, setCursorPos] = useState(0);
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
        const newContent =
            content.slice(0, start) + plainText + content.slice(end);

        localStorage.setItem('note', newContent);

        setContent(newContent);

        setTimeout(() => {
            target.setSelectionRange(
                start + plainText.length,
                start + plainText.length
            );

            resize(event.target as HTMLElement);

            scrollBodyToBottom();
        }, 0);
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
        window.scrollTo({
            top: document.documentElement.scrollHeight,
        });
    }

    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.selectionStart = cursorPos;
            textAreaRef.current.selectionEnd = cursorPos;
        }
    }, [cursorPos]);

    useEffect(() => {
        if (content.length <= chars) {
            return;
        }

        scrollBodyToBottom();
    }, [content]);

    useEffect(() => {
        setTimeout(() => {
            if (!textAreaRef.current) return;

            textAreaRef.current.setSelectionRange(
                textAreaRef.current.value.length,
                textAreaRef.current.value.length
            );

            resize(textAreaRef.current);

            scrollBodyToBottom();
        }, 0);

        window.addEventListener('click', focus);

        function focus(event: Event) {
            if (
                textAreaRef.current &&
                !textAreaRef.current.contains(event.target as Node)
            ) {
                if (window.getSelection) {
                    window.getSelection()?.removeAllRanges();
                }
            }

            textAreaRef.current?.focus();
        }

        return () => window.removeEventListener('click', focus);
    }, []);

    return (
        <>
            <div className={styles.editor} style={{ width }}>
                <div
                    className={styles.overlay}
                    style={{ width }}
                    aria-hidden="true"
                >
                    {highlightText(content)}
                </div>
                <textarea
                    ref={textAreaRef}
                    style={{ width }}
                    value={content}
                    onChange={handleInput}
                    onPaste={handlePaste}
                    autoFocus
                    rows={1}
                    spellCheck={false}
                />

                <div className={styles.bar} />
            </div>
            <StatusBar content={content} />
        </>
    );
}

export default Editor;
