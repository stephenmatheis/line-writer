# Roadmap

Feature ideas, roughly in the order they came up. Nothing here is committed to yet.

## 1. Smarter focus highlighting — DONE (went with b, visual lines)

Current behavior: everything after the last punctuation mark (`.` `!` `?`) is the
_current_ sentence and stays dark; everything before it is grayed out to keep focus
on what's being written. Works okay, but breaks on bullets and ellipses made with
three periods.

Two paths forward — undecided:

- **a. Wait for a space after the last punctuation mark** before treating the
  sentence as finished (so `...` or `1.` mid-typing doesn't end the sentence).
- **b. Break on visual lines instead of sentences.** Only the visually centered
  line is dark; everything above (or below, when editing a line in the middle) is
  de-focused.

## 2. Full vim support

Ambitious. Start with the obvious:

- Modes (normal / insert)
- HJKL movement
- Motions with counts and operators (e.g. `10j`, `dd`)

## 3. Command palette

### Versions

- **v1** SHIPPED shell + theme
- **v2** SHIPPED copy note, share URL
- **v3** SHIPPED notes management (new / open / delete / export, share links import as new notes)
- **v4** SHIPPED customize font, font size
- **v5** SHIPPED line height
- **v5.1** SHIPPED tie command palette line height to selection
- **v5.2** SHIPPED fix bug: when choosing a command palette picker with the mouse thus triggering a sub menu, escape no longer goes back to the main menu
- **v5.3** SHIPPED toggle .editor background color of #ff000030 and red bar for testing (off by default)
- **v5.4** SHIPPED editor width choice: narrow = 30ch, normal = 60ch, wide = 90ch (default normal)
- **v6** SHIPPED search: note titles are flattened into the top-level palette
  list and fuzzy-matched right alongside commands - no "Open note..." submenu
  to drill into first. "Delete note..." keeps its own submenu since it's
  destructive. Results are grouped into labeled sections ("Notes" /
  "Commands") whenever more than one group is present, so a mixed result
  list still reads as two things instead of one blended pile; any
  single-group list (every submenu) shows no headers at all. Note _content_
  search is out of scope for the palette (no room for match context/snippets
  in a single-line list) - would need its own UI.
- **v7** TO DO colors (complimentary dark and light)
- **v8** TO DO AI

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

No clue how to go about this one yet. Need to think on it.

## 6. Display styles

- **Cards** Think hypercard. Keyboard/mouse through stacks of cards.
- **Fullscreen** Current UI.
- **List** List of notes in a sidebar. Mouse/keyboard to select. Note in right box. Think TUI designs.
