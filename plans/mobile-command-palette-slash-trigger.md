# Slash-command trigger for the mobile command palette

## Context

The command palette (`src/components/command-palette/command-palette.tsx`) only opens via `Cmd/Ctrl+P` / `Cmd/Ctrl+Shift+P` — a `window` keydown listener. There's no mobile trigger at all, and the goal is to add one with zero visible chrome (no button/icon). After exploring several gesture options (two-finger tap, long-press, edge swipe — all rejected for OS-gesture conflicts or poor discoverability), the chosen approach is a **slash command**: typing `/` as the first character on an otherwise-empty line opens the palette, Notion/Slack-style, and the `/` itself is swallowed rather than inserted. This reuses the editor's existing text-input path instead of adding new gesture-recognition code, and works identically on touch and desktop.

## Architecture

`Editor` and `Commands` (which renders `CommandPalette`) are unconnected sibling components under `src/app.tsx:57-58` — no shared state or context between them. `CommandPalette` owns `isOpen`/`open()` internally and only reacts to its own `window`-level `keydown` listener. To signal it from the editor's textarea without lifting state or adding a provider, use a `CustomEvent` dispatched on `window` — this mirrors the app's existing loose-coupling idiom (the `data-no-refocus` DOM-attribute signal already used between these same two components, `editor.tsx:187`).

## Changes

**`src/components/command-palette/command-palette.tsx`**

- Export a constant `SLASH_TRIGGER_EVENT = 'line-writer:slash-trigger'`.
- In the existing `useEffect` at lines 111-129 (the one with `onKeyDown`), add a listener for this custom event alongside the keydown one. On receipt, if not already open, call `open(getQuickOpenCommands)` — same list as bare `Cmd/Ctrl+P`, since `/` is the unmodified gesture with no natural shift-equivalent on touch. Mirror the existing `if (isOpen)` early-return so a second trigger while open is a no-op (don't close it — closing on `/` isn't an expected keystroke the way pressing the same shortcut twice is).

**`src/components/command-palette/index.ts`**

- Re-export `SLASH_TRIGGER_EVENT` alongside `CommandPalette`.

**`src/components/editor/editor.tsx`**

- Add a `handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>)` and wire it via `onKeyDown={handleKeyDown}` on the `<textarea>` (currently only has `onChange`, lines 231-239).
- Logic:
    1. Bail unless `event.key === '/'` and `!event.nativeEvent.isComposing` (guards IME composition).
    2. Bail if `target.selectionStart !== target.selectionEnd` (an actual selection is being replaced, not a plain insert at an empty spot).
    3. Compute the current line's bounds from `content` (the existing string state) via `lastIndexOf('\n', ...)` / `indexOf('\n', ...)`, and bail unless `content.slice(lineStart, lineEnd).trim() === ''` — the **whole line** must be blank (not just the text before the caret), and `.trim()` (not `===''`) so a whitespace-indented blank line still counts.
    4. If all checks pass: `event.preventDefault()` (so `/` never gets inserted — no state update fires, so nothing enters undo history either) and `window.dispatchEvent(new CustomEvent(SLASH_TRIGGER_EVENT))`.
- No `hasFinePointer` gate — enable on both touch and desktop for simplicity; the whole-line-blank guard already makes accidental desktop triggers rare and harmless (you'd have to press `/` on an empty line, which does nothing else useful anyway).
- Import `SLASH_TRIGGER_EVENT` from `@/components/command-palette`.

## Edge cases handled

- IME composition: guarded via `isComposing`.
- Real text selection spanning into an empty line: guarded via `selectionStart !== selectionEnd`.
- Mid-line `/` (e.g. "and/or"): guarded via the whole-line-blank check — inserts normally.
- Undo: `preventDefault()` stops the native edit before any `onChange`/state update, so no undo entry is created for the swallowed `/`.

## Tests

Add cases to `tests/command-palette.spec.ts` (pattern-match the existing `openQuickOpen`/`openPalette` helpers at lines 10-19):

- Typing `/` on an empty note opens the palette (same assertions as `openQuickOpen`'s test), and the textarea value does not contain `/`.
- Typing `/` mid-line (e.g. after existing text) inserts it normally and does _not_ open the palette.

After the automated tests, use the `verify` skill to manually confirm end-to-end behavior, including on a touch-emulated viewport.
