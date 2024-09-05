// https://chatgpt.com/share/ee4b1b02-bc03-46cf-bc2c-6c943f386782

import {
    ChangeEvent,
    ClipboardEvent,
    useState,
    useRef,
    useEffect,
} from 'react';
import styles from './editor.module.scss';

export function Editor() {
    const [content, setContent] = useState('');
    const [cursorPos, setCursorPos] = useState(0);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    function handleInput(event: ChangeEvent<HTMLTextAreaElement>) {
        const newText = event.target.value;

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

        setContent(content.slice(0, start) + plainText + content.slice(end));

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
        // console.log('resize:', node.scrollHeight);

        node.style.height = 'auto';
        node.style.height = `${node.scrollHeight}px`;
        // node.style.height = `${
        //     node.scrollHeight > 48 * 2
        //         ? node.scrollHeight + 48
        //         : node.scrollHeight
        // }px`;
    }

    function keepTypingLineCentered() {
        // console.log('Center line:', document.documentElement.scrollHeight);
        // console.log('scroll off');

        return;

        scrollBodyToBottom();
    }

    function highlightText(text: string) {
        // Regular expression to split text by sentence endings (period, exclamation, question mark)
        const sentenceRegex = /([^.!?]+[.!?])/g;
        const sentences = text.match(sentenceRegex) || [];
        const lastSentence = text.slice(sentences.join('').length);

        return (
            <>
                {sentences.map((sentence, index) => (
                    <span key={index} className={styles.fade}>
                        {sentence}
                    </span>
                ))}
                {lastSentence && (
                    <span className={styles.current}>{lastSentence}</span>
                )}
            </>
        );
    }

    function scrollBodyToBottom() {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            // behavior: 'smooth',
        });
    }

    // Maintain cursor position on textarea focus
    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.selectionStart = cursorPos;
            textAreaRef.current.selectionEnd = cursorPos;
        }
    }, [cursorPos]);

    useEffect(() => {
        // console.log('chars:', content.length);

        if (content.length < 21) {
            return;
        }

        window.scrollTo({
            top: document.documentElement.scrollHeight,
        });

        // if (content.length % 20 > 0) {
        //     console.log('new line');

        //     window.scrollTo({
        //         top: document.documentElement.scrollHeight,
        //     });
        // }
    }, [content]);

    return (
        <div className={styles.editor}>
            <div
                className={styles.overlay}
                onClick={() => textAreaRef.current?.focus()}
                aria-hidden="true"
            >
                {highlightText(content)}
            </div>
            <textarea
                ref={textAreaRef}
                value={content}
                onChange={handleInput}
                onPaste={handlePaste}
                onInput={keepTypingLineCentered}
                autoFocus
                rows={1}
            />

            <div className={styles.bar} />
        </div>
    );
}

export default Editor;
