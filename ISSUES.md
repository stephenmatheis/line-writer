# Issues

Running log of bugs found and fixed. Newest first.

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
