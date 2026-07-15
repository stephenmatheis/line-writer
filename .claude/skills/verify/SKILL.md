---
name: verify
description: How to launch and drive Line Writer to verify editor changes end-to-end.
---

# Verifying Line Writer

## Launch

```bash
npm run dev   # vp dev; picks the next port if 5173 is busy — read the URL from output
```

## Drive (Playwright, headless)

Playwright is a devDependency but scripts outside the repo can't resolve it —
import by absolute path:

```js
import { chromium } from '<repo>/node_modules/@playwright/test/index.mjs';
```

Useful handles:

- Textarea: `#editor`. Fill with `locator('#editor').fill(text)`, then type one
  real keystroke — `fill()` alone doesn't exercise the input path.
- Focus-line highlight: `div[class*="overlay"] span` (CSS modules hash the class).
- Centering check: span rect center vs `window.innerHeight / 2` should be ~0
  (except near document edges, where `window.scrollTo` clamps).

## Gotchas

- The highlight span's rect height is the ~22px text box, NOT the 44px
  line-height grid. For coordinate math (clicking a specific line), use
  `getComputedStyle(textarea).lineHeight`, not the span height.
- Caret-only moves flow through a native `selectionchange` listener, which is
  async — the highlight/scroll land a frame or two after the input. Poll for
  the highlight instead of asserting immediately after a keypress/click.
- Typing and keyboard scrolls are instant; mouse gestures are frozen until
  the button is released, then the re-center animates (`behavior: 'smooth'`,
  ~300-500ms) — expect zero scroll while the button is down, and wait for the
  settle point after release.
- Don't mutate app DOM (or trigger React renders) while simulating a drag:
  WebKit corrupts an in-flight drag selection if the page re-renders under it.
  That's why the app defers all updates to mouse release — a regression here
  shows up as `selectionStart` snapping to 0 mid-drag in the WebKit project.
