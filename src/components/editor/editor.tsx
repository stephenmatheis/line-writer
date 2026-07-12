import { ChangeEvent, KeyboardEvent, SyntheticEvent, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { noteContent, saveNote } from '@/lib/notes';
import { useFont } from '@/providers/font-provider';
import { useAI, type Action, type GenerateHandle } from '@/providers/ai-provider';
import { SlashMenu, type SlashMenuHandle } from '@/components/slash-menu';
import styles from './editor.module.scss';

type SlashMenuState = {
    // offset where "/" was typed (and prevented from landing in content) -
    // also where generated text gets spliced in once an action runs
    triggerStart: number;
    position: { top: number; left: number };
};

type Generation = {
    handle: GenerateHandle;
    // content with the "/query" text already stripped back to an empty
    // line, captured once - every chunk re-splices against this same base
    // rather than the live (already-spliced) content
    baseContent: string;
    insertStart: number;
    replaceEnd: number;
    accumulated: string;
};

// One editor edits one note. The app remounts it (key={noteId}) when the
// active note changes, so all the state below starts over from storage.
export function Editor({ noteId }: { noteId: string }) {
    const { font, fontSize, lineHeight, width } = useFont();
    const ai = useAI();
    const [content, setContent] = useState(noteContent(noteId));
    const [cursorPos, setCursorPos] = useState(content.length);
    const [focusRange, setFocusRange] = useState({ start: 0, end: 0 });
    // most recent non-empty selection, independent of cursorPos - kept even
    // after the caret later moves to an empty line to invoke the slash menu,
    // so "Rewrite"/"Fix grammar" still know what text to act on
    const [lastSelection, setLastSelection] = useState<{ start: number; end: number } | null>(null);
    const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const slashMenuHandleRef = useRef<SlashMenuHandle>(null);
    const generationRef = useRef<Generation | null>(null);

    function handleInput(event: ChangeEvent<HTMLTextAreaElement>) {
        const newText = event.target.value;

        saveNote(noteId, newText);

        setContent(newText);
        setCursorPos(event.target.selectionStart || 0);
    }

    function handleSelect(event: SyntheticEvent<HTMLTextAreaElement>) {
        const { selectionStart, selectionEnd } = event.currentTarget;

        if (selectionStart !== selectionEnd) {
            setLastSelection({ start: selectionStart, end: selectionEnd });
        }

        if (!slashMenu || isGenerating) return;

        // still a collapsed caret sitting somewhere on the trigger's line?
        const stillOnTriggerLine =
            selectionStart === selectionEnd &&
            selectionStart >= slashMenu.triggerStart &&
            !content.slice(slashMenu.triggerStart, selectionStart).includes('\n');

        if (!stillOnTriggerLine) {
            setSlashMenu(null);
        }
    }

    function openSlashMenu(triggerStart: number) {
        if (!textAreaRef.current) return;

        setSlashMenu({ triggerStart, position: measureCaretPoint(textAreaRef.current, content, triggerStart) });
    }

    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (isGenerating) {
            if (event.key === 'Escape') {
                event.preventDefault();
                cancelGeneration();
            }

            return;
        }

        if (slashMenu) {
            if (event.key === 'Escape') {
                event.preventDefault();
                setSlashMenu(null);

                return;
            }

            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                slashMenuHandleRef.current?.moveSelection(event.key === 'ArrowDown' ? 1 : -1);

                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                slashMenuHandleRef.current?.confirmSelection();

                return;
            }

            // any other key (typing more of the query, backspace, ...)
            // falls through and lands in content as usual
            return;
        }

        if (event.key !== '/') return;

        const { selectionStart, selectionEnd } = event.currentTarget;

        if (selectionStart !== selectionEnd) return; // no active selection

        const before = content.slice(0, selectionStart);
        const after = content.slice(selectionStart);
        const lineStart = before.lastIndexOf('\n') + 1;
        const lineEndOffset = after.indexOf('\n');
        const restOfLine = lineEndOffset === -1 ? after : after.slice(0, lineEndOffset);
        const beforeOnLine = content.slice(lineStart, selectionStart);

        if (beforeOnLine.trim() !== '' || restOfLine.trim() !== '') return; // not an otherwise-empty line

        event.preventDefault(); // the "/" never actually lands in content
        openSlashMenu(selectionStart);
    }

    async function handleSlashAction(action: Action) {
        if (!slashMenu) return;

        const removedLength = cursorPos - slashMenu.triggerStart;
        const baseContent = content.slice(0, slashMenu.triggerStart) + content.slice(cursorPos);

        let insertStart: number;
        let replaceEnd: number;
        let promptText: string;

        if (action === 'continue') {
            insertStart = slashMenu.triggerStart;
            replaceEnd = slashMenu.triggerStart;
            promptText = baseContent.slice(Math.max(0, insertStart - 2000), insertStart);
        } else {
            if (!lastSelection) return; // menu disables these without a selection

            const shift = (offset: number) => (offset >= cursorPos ? offset - removedLength : offset);

            insertStart = shift(lastSelection.start);
            replaceEnd = shift(lastSelection.end);
            promptText = content.slice(lastSelection.start, lastSelection.end);
        }

        setContent(baseContent);
        setCursorPos(insertStart);
        setIsGenerating(true);

        const handle = ai.generate(action, promptText, (token) => {
            const generation = generationRef.current;

            if (!generation) return; // cancelled

            const isFirstChunk = generation.accumulated === '';

            generation.accumulated += token;

            const spliced =
                generation.baseContent.slice(0, generation.insertStart) +
                generation.accumulated +
                generation.baseContent.slice(generation.replaceEnd);

            saveNote(noteId, spliced);
            setContent(spliced);
            setCursorPos(generation.insertStart + generation.accumulated.length);

            // the menu's position was measured before any text streamed in;
            // once the note starts changing under it, that position goes
            // stale immediately, so close it on the first sign of output
            if (isFirstChunk) setSlashMenu(null);
        });

        generationRef.current = { handle, baseContent, insertStart, replaceEnd, accumulated: '' };

        try {
            await handle.promise;
        } catch {
            // errored - nothing fancy for v1, just stop
        } finally {
            generationRef.current = null;
            setIsGenerating(false);
            setSlashMenu(null); // safety net if generation ended before any chunk arrived
        }
    }

    function cancelGeneration() {
        generationRef.current?.handle.cancel();
        // optimistic unlock - don't wait for the worker's ack; ignore any
        // chunks that trickle in after (generationRef is already cleared,
        // and the onChunk callback above no-ops once it is)
        generationRef.current = null;
        setIsGenerating(false);
        setSlashMenu(null);
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
        const textNode = document.createTextNode(text + '​');

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

    // Same mirror-div idea as measureCaretLine, but returns a viewport
    // pixel point (via a marker span's own rect) instead of a line index -
    // measureCaretLine only ever needed relative line numbers, this needs
    // real x/y to anchor the slash menu's portal.
    function measureCaretPoint(textArea: HTMLTextAreaElement, text: string, caret: number) {
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

        mirror.appendChild(document.createTextNode(text.slice(0, caret)));

        const marker = document.createElement('span');

        marker.textContent = '​';
        mirror.appendChild(marker);
        document.body.appendChild(mirror);

        const mirrorRect = mirror.getBoundingClientRect();
        const markerRect = marker.getBoundingClientRect();
        const textAreaRect = textArea.getBoundingClientRect();

        mirror.remove();

        return {
            // the marker's offset within the mirror's own flow, re-anchored
            // onto the real textarea's actual viewport position - the
            // mirror itself renders wherever document.body's static flow
            // happens to put it, which is meaningless on its own
            top: textAreaRect.top - textArea.scrollTop + (markerRect.top - mirrorRect.top) + parseFloat(cs.lineHeight),
            left: textAreaRect.left - textArea.scrollLeft + (markerRect.left - mirrorRect.left),
        };
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
        // the typography settings matter here too: changing any of them moves
        // wrap points, the ch-based width, or the line grid itself, so
        // everything needs measuring again
    }, [content, cursorPos, font, fontSize, lineHeight, width]);

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.style.opacity = '1';
        }

        // FIXME: Scrolls on mobile when clicking menu
        window.addEventListener('click', focus);

        function focus(event: Event) {
            // other UI (command palette, future modals) opts out of the
            // always-refocus-the-editor behavior with this attribute. Query
            // the live DOM instead of walking up from event.target: clicking
            // a command that swaps the palette's list (drilling into a
            // sub-menu) makes React detach that row before this handler
            // runs, so closest() on the stale event.target would miss it
            // and this would steal focus back from the palette.
            if (document.querySelector('[data-no-refocus]')) {
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
                onSelect={handleSelect}
                onKeyDown={handleKeyDown}
                readOnly={isGenerating}
                autoFocus
                rows={1}
                spellCheck={false}
                id="editor"
            />

            {slashMenu && (
                <SlashMenu
                    ref={slashMenuHandleRef}
                    query={content.slice(slashMenu.triggerStart, cursorPos)}
                    position={slashMenu.position}
                    disabledActions={new Set<Action>(lastSelection ? [] : ['rewrite', 'fix-grammar'])}
                    isGenerating={isGenerating}
                    onSelect={handleSlashAction}
                />
            )}

            <div className={styles.bar} />
        </div>
    );
}

export default Editor;
