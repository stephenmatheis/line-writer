# Issues

Running log of bugs found and fixed. Newest first.

---

## #4 — No user feedback when clipboard or share-link import fails

|               |                                                       |
| ------------- | ----------------------------------------------------- |
| **Status**    | Open                                                  |
| **Opened**    | 2026-07-13                                            |
| **Severity**  | Low                                                   |
| **Component** | `src/components/commands/commands.tsx`, `src/app.tsx` |
| **Found by**  | Code review                                           |

### What happens

Two flows fail silently:

1. **Copy note / Copy share link** — `navigator.clipboard.writeText` can
   reject (document not focused, permission denied, or
   `navigator.clipboard` undefined on plain-http hosts). The palette closes
   as if it worked, the rejection is unhandled, and the clipboard is
   unchanged.
2. **Opening a corrupt share link** — `decodeNote` throws (bad base64,
   truncated payload, unknown kind byte), `app.tsx` logs to the console,
   strips the hash, and shows the previously active note. To the person
   who clicked the link it looks like the link just didn't do anything.

### Why it's still open

There's no notification surface in the UI yet (no toast, no status line).
Worth deciding what that surface is before wiring these two into it —
a fix that adds a whole notification system for two edge cases might not
be worth it. Documenting instead of fixing for now.

### Decision

Great callouts. Let's create a notification system to surface currently silent errors like this. I don't love or hate toasts. Modals that take over until dismissed are a bad call. Users (me included) typically dislike them. What over experiences are out there? I can't decided if a status bar at the bottom or pop up cards in the bottom right like VS CODE does it. Not sure what UX I want.

---

## #3 — Moving the caret without typing doesn't move the focus line

|               |                                    |
| ------------- | ---------------------------------- |
| **Status**    | Open                               |
| **Opened**    | 2026-07-13                         |
| **Severity**  | Medium                             |
| **Component** | `src/components/editor/editor.tsx` |
| **Found by**  | Code review                        |

### What happens

The highlight and typewriter centering only react to _input_. Clicking
into another line, or moving with the arrow keys, moves the real textarea
caret but not the dark focus line or the scroll position — those catch up
only on the next keystroke that changes the text (and that keystroke lands
wherever the caret actually is, which can read as a jump).

### Root cause

`cursorPos` state is only updated inside `handleInput` (the `onChange`
handler). Nothing listens for selection movement that doesn't change the
text — no `selectionchange`/`keyup`/`click` handler on the textarea.

### Why it's still open

Might be half-intentional (a typewriter re-centering on every arrow press
could feel jumpy), but the first keystroke after a click visibly editing
"somewhere else" feels like a bug. Needs a design call: recenter on any
selection change, or keep centering input-driven and only sync the
highlight. Documenting before changing behavior.

### Decision

I agree this is weird. Right now, moving the cursor up does nothing, like you state. Observed on my end. But if the cursor is moved with an arrow key above of below the viewport, scroll jumps to center the line where the cursor is but doesn't highlight. The originally centered line is still highlighted as well.

Let's always keep the line with the cursor on it centered. Arrow or mouse click. Might be jumpy. But I'd like to see it in action before we say it's the wrong UX. Let me know if you think there's a better way.

---

## #2 — index.html declared the wrong favicon files for 48px and 128px

|               |              |
| ------------- | ------------ |
| **Status**    | Closed       |
| **Opened**    | 2026-07-13   |
| **Closed**    | 2026-07-13   |
| **Severity**  | Low          |
| **Component** | `index.html` |
| **Found by**  | Code review  |

### What happened

The `sizes="48x48"` icon link pointed at `favicon-16x16.png` and the
`sizes="128x128"` link at `favicon-32x32.png`, so browsers picking the
larger slots got upscaled small icons. The real 48px and 128px files were
sitting unused in `public/favicons/` (the extension `manifest.json` had
them right).

### Fix

Pointed each `<link>` at the file matching its declared size.

---

## #1 — Command palette: stale query survives reopen

|               |                                                                            |
| ------------- | -------------------------------------------------------------------------- |
| **Status**    | Closed                                                                     |
| **Opened**    | 2026-07-10                                                                 |
| **Closed**    | 2026-07-10                                                                 |
| **Severity**  | Medium                                                                     |
| **Component** | `src/components/command-palette/command-palette.tsx`                       |
| **Found by**  | Automated verification (Playwright), during v1 development — never shipped |

### What happened

After closing the palette with Escape and reopening it, the previous search
query was still live for one render. Anything typed in that window was
appended to the _old_ query instead of starting fresh — e.g. close while the
input held `thl`, reopen, type `share`, and the palette filtered on
`thlshare`. Nothing matched, so Enter did nothing and the selected command
appeared broken.

### How it was triggered

1. Open the palette (`cmd/ctrl+shift+p`) and type anything.
2. Close with Escape.
3. Reopen and start typing immediately.

A human typist usually lost the race and never saw it; an automated test (or
a fast typist chaining the shortcut into a command) hit it reliably.

### Root cause

The query reset lived in a `useEffect` watching `isOpen`:

```tsx
useEffect(() => {
    if (isOpen) {
        setQuery('');
        ...
    }
}, [isOpen]);
```

Effects run _after_ the opening render commits, so the palette first renders
with the stale query, and only then schedules the reset. Input events that
land before the reset commits read the input's current (stale) value and
append to it. Closing the palette renders `null` but keeps the component
mounted, so state persists across open/close cycles.

### Fix

Reset the query and selection synchronously in the same state update that
opens the palette, so the opening render starts clean. The effect now only
manages focus:

```tsx
function open() {
    setQuery('');
    setSelected(0);
    setIsOpen(true);
}
```

### Regression test

`tests/command-palette.spec.ts` — "resets the query when reopened".
