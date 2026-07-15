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
- Scrolling is instant (no `scroll-behavior: smooth`), so no settle waits
  beyond a ~100ms React tick are needed.
