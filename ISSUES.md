# Issues

Running log of bugs found and fixed. Newest first.

---

## #8 — App crashed on first load over a LAN IP (mobile testing)

|               |                              |
| ------------- | ---------------------------- |
| **Status**    | Closed                       |
| **Opened**    | 2026-07-15                   |
| **Closed**    | 2026-07-15                   |
| **Severity**  | High                         |
| **Component** | `src/lib/notes.ts`           |
| **Found by**  | User testing on a real phone |

### What happened

Loading the dev server from a phone over the LAN (`http://192.168.x.x:5173`,
not `localhost`) showed a permanently blank white page. Looked at first like
a mobile-specific focus/keyboard bug - tapping the note never brought up the
on-screen keyboard - but that was a red herring chased for a while (gating
`autoFocus`, disabling the click-to-refocus handler) before the real cause
turned up in the console: `crypto.randomUUID is not a function`, thrown from
`createNote()` during the very first render.

### Root cause

`crypto.randomUUID()` only exists in [secure
contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) -
HTTPS, or the special-cased `localhost`/`127.0.0.1`. Plain HTTP to a LAN IP
address doesn't qualify, so `crypto.randomUUID` is simply undefined there.
Every fresh visit to that origin has an empty `notes` index (localStorage is
per-origin, and `192.168.x.x:5173` is a different origin than
`localhost:5173`), so `ensureNotes()` always called `createNote()` on that
device, which always threw - crashing the whole render before the editor
ever mounted. `localhost`, the iPhone simulator, and Chrome via `localhost`
all worked fine, which is what made this look device-specific instead of
context-specific at first.

### Fix

Replaced `crypto.randomUUID()` with a small `randomId()` helper built on
`crypto.getRandomValues()`, which has no secure-context restriction and
works identically everywhere. Builds the same UUID v4 shape by hand (version
and variant bits set manually), so the note ID format is unchanged.

### Regression test

`tests/notes.spec.ts` - "the first note is created even without
crypto.randomUUID" (shadows `window.crypto.randomUUID` with `undefined` via
`Object.defineProperty` - it lives on `Crypto.prototype`, not the instance,
so a plain `delete` is a no-op - then clears storage and reloads to hit the
empty-index `createNote()` path).

---

## #7 — Reverted caret-move/drag re-centering from #3 and #6

|               |                                    |
| ------------- | ---------------------------------- |
| **Status**    | Closed                             |
| **Opened**    | 2026-07-15                         |
| **Closed**    | 2026-07-15                         |
| **Severity**  | N/A (design decision, not a bug)   |
| **Component** | `src/components/editor/editor.tsx` |
| **Found by**  | Simplification decision            |

### What changed

The `selectionchange`/`mouseup`/`mousedown` machinery added for #3 (caret-
move re-centering) and #6 (drag-select without corrupting the selection or
scrolling under the pointer) has been removed. The editor now re-centers
and re-highlights only in response to text edits (`handleInput`) - moving
the caret with arrow keys, clicking another line, or drag-selecting no
longer touches `cursorPos`, `focusRange`, or scroll position.

### Why

The mouse/selectionchange machinery was a lot of surface area (a
`mousedown` handler, a `mouseup` handler, a document-level
`selectionchange` listener, direction-tracking, scroll-behavior state) for
UX that wasn't worth the complexity it added. Simpler mechanism wins:
centering that only reacts to edits is easy to reason about and has no
drag-corruption or race conditions to guard against in the first place.

### Consequence

#3 and #6 stay "Closed" below as an accurate record of the bugs that
existed and how they were fixed _at the time_ - but both fixes have since
been superseded by this entry. The regression tests written for them
(`tests/editor.spec.ts` - the arrow-key, click, drag, and shift-select
re-centering tests) were removed rather than updated, since they asserted
behavior that no longer exists by design.

---

## #6 — Re-centering during mouse drags made selection nearly unusable

|               |                                    |
| ------------- | ---------------------------------- |
| **Status**    | Closed                             |
| **Opened**    | 2026-07-14                         |
| **Closed**    | 2026-07-14                         |
| **Severity**  | High                               |
| **Component** | `src/components/editor/editor.tsx` |
| **Found by**  | User feedback (follow-up to #5)    |

### What happened

After #5, caret updates fired on every `selectionchange` - including each
step of a mouse drag. The smooth re-center then scrolled the text out
from under the pointer mid-drag, so click-and-drag selection meant
aiming at a moving target.

Investigating turned up a second, worse problem hiding underneath: even
_without_ scrolling, reacting to mid-drag selection changes re-renders
the overlay and resizes the textarea while WebKit's drag machinery is
live, which corrupts the selection - the start snapped to 0 on the
first drag movement (a bare textarea drags fine, so it's our mutations,
not the browser). In Safari, dragging up two lines selected back to the
top of the note.

### Fix

New mouse model: **while the button is down, the world holds still.**
The `selectionchange` listener ignores updates during a mouse gesture
(and ignores direction-less ranges generally - those are mouse-made and
resolve at release), so nothing re-renders or scrolls mid-drag. On
mouseup, one deferred update moves the highlight and glides the caret
line to center. `mousedown` also freezes any in-flight glide so a
previous click's animation can't move the page under a new drag.

Which end of a drag-selection to center: `selectionDirection` is
`'none'` for mouse selections in both Chrome and WebKit, and Chromium
coalesces away the collapse event on fast drags, so anchor tracking is
unreliable. Instead the mouseup handler uses the release coordinates -
the pointer is by definition sitting on the end that moved - and picks
the selection end whose line is nearest.

Keyboard behavior is untouched: instant re-centering, direction-aware
via `selectionDirection`, which keyboard selections always report.

### Regression test

`tests/editor.spec.ts` - "dragging a selection holds the page still
until release" (asserts zero scroll during the drag, the range
surviving, and the dragged end centered after release, in both
engines - the WebKit run guards the selection-corruption case).

**Superseded by [#7](#7--reverted-caret-movedrag-re-centering-from-3-and-6):**
this fix was later removed as part of a simplification; drag-selects no
longer re-center at all.

---

## #5 — Caret-move centering lags behind the caret

|               |                                    |
| ------------- | ---------------------------------- |
| **Status**    | Closed                             |
| **Opened**    | 2026-07-14                         |
| **Closed**    | 2026-07-14                         |
| **Severity**  | Medium                             |
| **Component** | `src/components/editor/editor.tsx` |
| **Found by**  | User feedback (follow-up to #3)    |

### What happened

After #3 wired caret-only moves into the centering, the caret visibly
moved and the highlight/scroll caught up noticeably later. Measured in
the running app: a click didn't re-center until mouse _release_
(~150ms with a slow click), and worse, an arrow press often didn't
re-center until the _next_ input event arrived - press again 400ms
later and that's when the previous move's scroll landed.

### Root cause

React's synthetic `onSelect` was the messenger, and it's the wrong one.
Its select plugin never receives the native `selectionchange` (that
event fires at `document` and doesn't bubble through React's root), so
it can only synthesize `onSelect` while processing some other event it
does receive - the next keydown, or mouseup (it also deliberately holds
updates while the mouse button is down). Hence "centering waits for the
next input".

### Fix

Two parts:

1. Dropped `onSelect` for a native `document.addEventListener('selectionchange')`
   in the editor's mount effect, guarded by `document.activeElement`
   being the textarea. It fires as soon as the browser moves the caret.
   Measured after: arrows re-center in 1-2 frames (~10-17ms, down from
   "whenever the next input arrives"), clicks start moving at mouse
   _press_ (down from release).
2. Clicks now re-center with `behavior: 'smooth'` (a `scrollBehavior`
   ref flipped in `onMouseDown`, consumed and reset by the scroll
   effect) so the clicked line glides to center instead of teleporting.
   Typing and keyboard movement stay instant - that's the typewriter
   feel, and smooth scrolling can't keep up with held-down arrows.

Verification caught a bonus bug the change exposed: re-centering now
starts while the mouse button is still down, so the page scrolls out
from under a click and mouseup lands on a different element - making
`event.target` an ancestor, so the window click-to-refocus handler
treated it as an "outside" click. Its `removeAllRanges()` is harmless
in Chromium but resets the textarea caret to 0 in WebKit - a click
would throw you to the top of the note in Safari. The handler now bails
when the textarea is already focused (there's nothing to refocus).

### Regression test

`tests/editor.spec.ts` - the #3 tests now cover this path through the
native listener; the click test polls for the settle point of the
animated scroll, and the WebKit run guards the Safari caret-reset.

---

## #4 — No user feedback when clipboard or share-link import fails

|               |                                                       |
| ------------- | ----------------------------------------------------- |
| **Status**    | Closed                                                |
| **Opened**    | 2026-07-13                                            |
| **Closed**    | 2026-07-14                                            |
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

Went with an ephemeral status line: one small line of text, bottom
center, in the editor's font, that fades in and auto-dismisses. VS
Code-style cards exist because an IDE has dozens of notification
sources; this app has two error cases and a couple of confirmations, so
one message at a time (newest wins) is plenty. A persistent status bar
would be permanent chrome for something that fires rarely - against the
whole blank-page idea.

### Fix

New `StatusProvider` (`src/providers/status-provider.tsx`) exposes
`notify(text, kind?)` and owns the show/fade timing: info messages sit
for 4s, errors for 8s, then fade out via CSS. `StatusLine`
(`src/components/status-line/`) renders the message fixed at bottom
center - muted color for info, full text color for errors, page
background behind it so it stays readable when the note scrolls under
it, `pointer-events: none` so it never steals the click-to-refocus.
It announces as `role="status"` / `role="alert"` for screen readers.

Wired into both silent flows:

- **Copy note / Copy share link** now go through a shared
  `copyToClipboard` helper that confirms ("Copied note") or reports
  ("Couldn't copy - the browser blocked clipboard access").
- **Corrupt share links** report "Couldn't open the share link - it
  looks broken or incomplete" instead of silently showing the previous
  note.

The provider wraps `<App />` in `main.tsx` (not inside `app.tsx` with
the others) because App itself needs `notify` for the import error.

### Regression test

`tests/status.spec.ts` — "copy note confirms on the status line",
"a blocked clipboard shows an error instead of failing silently",
"a corrupt share link shows an error and falls back to the active
note".

---

## #3 — Moving the caret without typing doesn't move the focus line

|               |                                    |
| ------------- | ---------------------------------- |
| **Status**    | Closed                             |
| **Opened**    | 2026-07-13                         |
| **Closed**    | 2026-07-14                         |
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
"somewhere else" feels like a bug. Needs a design call: re-center on any
selection change, or keep centering input-driven and only sync the
highlight. Documenting before changing behavior.

### Decision

I agree this is weird. Right now, moving the cursor up does nothing, like you state. Observed on my end. But if the cursor is moved with an arrow key above of below the viewport, scroll jumps to center the line where the cursor is but doesn't highlight. The originally centered line is still highlighted as well.

Let's always keep the line with the cursor on it centered. Arrow or mouse click. Might be jumpy. But I'd like to see it in action before we say it's the wrong UX. Let me know if you think there's a better way.

### Fix

Added `onSelect` to the textarea. React fires it on every caret move —
arrow keys, clicks, drags — not just input, so feeding `cursorPos` from it
runs the existing measure/center/highlight effect for free. For range
selections, `cursorPos` follows the end the user is actively dragging
(`selectionDirection`), so shift+arrows and mouse drags center the line
that's growing, not the anchor.

One landmine: the old effect that synced `selectionStart`/`End` from
`cursorPos` ran on every change, which would have collapsed any range the
moment `onSelect` reported it. It only ever existed to put the caret at
the end of the note on mount, so it's mount-only now.

Verified in the running app (Chromium): arrows, clicks, shift-selection,
and mouse drags all re-center to within 1px with the highlight following;
selections survive. The scroll-jump-without-highlight behavior from the
decision notes is gone.

### Regression test

`tests/editor.spec.ts` — "arrow keys alone move the highlight and
re-center", "clicking another line moves the highlight and re-centers",
"shift-selecting follows the active end without collapsing".

**Superseded by [#7](#7--reverted-caret-movedrag-re-centering-from-3-and-6):**
this fix was later removed as part of a simplification; arrow keys and
clicks no longer re-center at all.

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
