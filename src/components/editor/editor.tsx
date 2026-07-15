import { ChangeEvent, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { noteContent, saveNote } from '@/lib/notes';
import { useFont } from '@/providers/font-provider';
import styles from './editor.module.scss';

// One editor edits one note. The app remounts it (key={noteId}) when the
// active note changes, so all the state below starts over from storage.
export function Editor({ noteId }: { noteId: string }) {
    const { font, fontSize, lineHeight, width } = useFont();
    const [content, setContent] = useState(noteContent(noteId));
    const [cursorPos, setCursorPos] = useState(content.length);
    const [focusRange, setFocusRange] = useState({ start: 0, end: 0 });
    const editorRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    // While the mouse button is down the world has to hold still. Two
    // reasons: re-centering mid-drag scrolls the text out from under the
    // pointer (click-and-drag becomes aiming at a moving target), and even
    // just re-rendering mid-drag corrupts WebKit's drag selection (observed:
    // the selection start snapped to 0 on the first drag movement). So caret
    // updates are held back until mouseup, which does one deferred
    // re-center with a glide.
    const mouseDown = useRef(false);
    // how the next re-center scrolls: keyboard and typing jump instantly
    // (the typewriter feel), mouseup sets 'smooth' so the clicked line
    // glides to center instead of jumping. Consumed and reset by the
    // scroll effect.
    const scrollBehavior = useRef<ScrollBehavior>('auto');

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

        // clientWidth is spec'd to round to an integer, but the textarea's
        // actual CSS width (ch-based, so fractional at most font sizes) can
        // land mid-pixel. Handing the mirror a rounded-down width makes it
        // wrap one character earlier or later than the real, fractionally-
        // sized textarea/overlay do - deterministically, on every measure,
        // not a rendering-jitter thing. getBoundingClientRect keeps the
        // fraction (there's no border/padding on the textarea for border-box
        // vs content-box to matter here).
        mirror.style.position = 'absolute';
        mirror.style.visibility = 'hidden';
        mirror.style.boxSizing = 'border-box';
        mirror.style.width = `${textArea.getBoundingClientRect().width}px`;
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

        const range = document.createRange();

        // The browser's own row boxes, not a lineHeight-multiples grid.
        // getComputedStyle's lineHeight is a rounded string, and dividing an
        // accumulated pixel offset by that approximation drifts further off
        // the more lines deep you measure - a few lines in, real font
        // hinting/antialiasing has pulled far enough from the rounded value
        // that Math.round tips the wrong way for whichever characters sit
        // closest to a row boundary (typically the tail end of a line, or a
        // character straddling a forced mid-word break). Reading the actual
        // rendered rows once and snapping every character to its nearest one
        // has no arithmetic to drift.
        range.setStart(textNode, 0);
        range.setEnd(textNode, text.length + 1);

        const rowTops: number[] = [];

        for (const rect of range.getClientRects()) {
            if (!rowTops.some((top) => Math.abs(top - rect.top) < lineHeight / 2)) {
                rowTops.push(rect.top);
            }
        }

        rowTops.sort((a, b) => a - b);

        // Get visual line of the character at index i. A newline's rect sits at
        // the end of the line it terminates, which is the line it belongs to.
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

    function scrollCaretLineToCenter(
        textArea: HTMLTextAreaElement,
        caretLine: number,
        lineHeight: number,
        behavior: ScrollBehavior,
    ) {
        const caretLineCenter =
            textArea.getBoundingClientRect().top + window.scrollY + caretLine * lineHeight + lineHeight / 2;

        window.scrollTo({
            top: caretLineCenter - window.innerHeight / 2,
            behavior,
        });
    }

    useLayoutEffect(() => {
        if (!textAreaRef.current) return;

        resize(textAreaRef.current);

        const { caretLine, lineStart, lineEnd, lineHeight } = measureCaretLine(textAreaRef.current, content, cursorPos);

        scrollCaretLineToCenter(textAreaRef.current, caretLine, lineHeight, scrollBehavior.current);
        scrollBehavior.current = 'auto';
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

        // The caret can move without the text changing - arrow keys, clicks,
        // drags - and onChange never fires for those. React's synthetic
        // onSelect can't drive this either: its select plugin never sees the
        // native selectionchange (it fires at document and doesn't bubble
        // through React's root), so it only synthesizes the event while
        // processing some other input - measured on this app, arrow presses
        // didn't re-center until the NEXT key went down. The native event
        // fires as soon as the browser moves the caret, so listen to it
        // directly.
        function handleSelectionChange() {
            const node = textAreaRef.current;

            if (!node || document.activeElement !== node) return;
            if (mouseDown.current) return;

            const { selectionStart: start, selectionEnd: end, selectionDirection } = node;

            // a range with no direction is mouse-made (keyboard selections
            // always report one) - those resolve in the mouseup handler,
            // and a trailing selectionchange must not second-guess it
            if (start !== end && selectionDirection === 'none') return;

            // for keyboard selections, follow the end the user is moving
            setCursorPos(selectionDirection === 'backward' ? start : end);
        }

        document.addEventListener('selectionchange', handleSelectionChange);

        // The deferred half of the mouse story: the world held still through
        // the click or drag, now move the highlight and glide the caret line
        // to center. For a drag that leaves a range, the line to center is
        // the end the user dragged - selectionDirection is 'none' for mouse
        // selections in both Chrome and WebKit, but the released pointer is
        // sitting on the end that moved, so pick the end nearest to it.
        function handleMouseUp(event: MouseEvent) {
            if (!mouseDown.current) return;

            mouseDown.current = false;

            const node = textAreaRef.current;

            if (!node) return;

            const { selectionStart: start, selectionEnd: end } = node;
            let caret = end;

            if (start !== end) {
                const lineHeight = parseFloat(getComputedStyle(node).lineHeight);
                const releaseLine = (event.clientY - node.getBoundingClientRect().top) / lineHeight - 0.5;
                const startLine = measureCaretLine(node, node.value, start).caretLine;
                const endLine = measureCaretLine(node, node.value, end).caretLine;

                caret = Math.abs(startLine - releaseLine) < Math.abs(endLine - releaseLine) ? start : end;
            }

            scrollBehavior.current = 'smooth';
            setCursorPos(caret);
        }

        window.addEventListener('mouseup', handleMouseUp);

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

            // Already focused? Then there's nothing to restore - bail before
            // the removeAllRanges/focus below can do damage. A drag that
            // ends outside the textarea (or a click whose mouseup glide has
            // already nudged the page) makes event.target an ancestor, not
            // the textarea. Without this guard that reads as an "outside"
            // click and clears the document selection, which in WebKit also
            // resets the textarea's caret to 0 - throwing you to the top of
            // the note.
            if (document.activeElement === textAreaRef.current) {
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
            document.removeEventListener('selectionchange', handleSelectionChange);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('click', focus);
        };
    }, []);

    // Put the caret at the end of the note on mount (autoFocus alone leaves
    // it wherever the browser feels like). Mount-only on purpose: cursorPos
    // now also tracks selections via the selectionchange listener, and
    // re-running this on every change would collapse any range the user
    // drags out.
    useEffect(() => {
        textAreaRef.current?.setSelectionRange(cursorPos, cursorPos);
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                onMouseDown={() => {
                    // freeze any in-flight glide (a scroll to the current
                    // position cancels it) so it can't move the page while
                    // the button is down
                    window.scrollTo({ top: window.scrollY, behavior: 'auto' });
                    mouseDown.current = true;
                }}
                autoFocus
                rows={1}
                spellCheck={false}
                id="editor"
            />

            <div className={styles.bar} />
        </div>
    );
}
