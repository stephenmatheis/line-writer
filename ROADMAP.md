# Roadmap

Feature ideas, roughly in the order they came up. Nothing here is committed to yet.

## 1. Smarter focus highlighting — DONE (went with b, visual lines)

Current behavior: everything after the last punctuation mark (`.` `!` `?`) is the
_current_ sentence and stays dark; everything before it is grayed out to keep focus
on what's being written. Works okay, but breaks on bullets and ellipses made with
three periods.

Two paths forward — undecided:

- **a) Wait for a space after the last punctuation mark** before treating the
  sentence as finished (so `...` or `1.` mid-typing doesn't end the sentence).
- **b) Break on visual lines instead of sentences.** Only the visually centered
  line is dark; everything above (or below, when editing a line in the middle) is
  de-focused.

## 2. Full vim support

Ambitious. Start with the obvious:

- Modes (normal / insert)
- HJKL movement
- Motions with counts and operators (e.g. `10j`, `dd`)

## 3. Command palette — v1 SHIPPED (shell + theme, copy note, share URL), notes management SHIPPED (new / open / delete / export, share links import as new notes; still to do: search, customize, AI)

Invoked with `cmd/ctrl+shift+p` like most systems use these days. Undecided whether
to also wire it to vim's `shift+;` (`:`) or keep those separate.

Things it would do:

- **Share a URL** with the note content encoded in it (base64 or something more
  compressed, like other apps do)
- **Manage notes** — add, load, delete, export
- **Search** across notes
- **Change theme** — dark, light, or system
- **Customize** — colors, font, font size
- **AI stuff** — no clue on the integration yet; just know it'll be useful and
  everyone has to have AI in their app today

## 4. Blocks (plain text)

Think Notion — invoked with slash (`/`) commands — but expanding to plain-text
Markdown: lists, links, etc. Not a full block system like modern collaborative
document apps; can't think of a way to make that work with plain text. Would be
cool though.

## 5. Syntax highlighting for code blocks
