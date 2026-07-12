import { CommandPalette, Command } from '@/components/command-palette';
import { useTheme, Theme } from '@/providers/theme-provider';
import { useFont, Font, FontSize, LINE_HEIGHTS, WIDTHS } from '@/providers/font-provider';
import { useGuide } from '@/providers/guide-provider';
import { encodeNote } from '@/lib/share';
import { createNote, deleteNote, listNotes, noteContent, setActiveNote } from '@/lib/notes';

const FONTS: { id: Font; label: string }[] = [
    { id: 'departure-mono', label: 'Departure Mono' },
    { id: 'pureprog', label: 'PureProg' },
    { id: 'paper-mono', label: 'Paper Mono' },
    { id: 'monospace', label: 'System monospace' },
];

const SIZES: { id: FontSize; label: string }[] = [
    { id: 'small', label: 'Small' },
    { id: 'medium', label: 'Medium' },
    { id: 'large', label: 'Large' },
];

// What Small/Medium/Large mean depends on the font. DepartureMono's
// designers recommend sizes in multiples of 11; anything else gets the
// defaults. These mirror the values in app.scss - the CSS renders them,
// this table is for the px hints in the pickers.
const DEPARTURE_SIZES: Record<FontSize, number> = { small: 11, medium: 16.5, large: 22 };
const DEFAULT_SIZES: Record<FontSize, number> = { small: 12, medium: 16, large: 20 };

function sizesFor(font: Font) {
    return font === 'departure-mono' ? DEPARTURE_SIZES : DEFAULT_SIZES;
}

const WIDTH_LABELS: Record<(typeof WIDTHS)[number], string> = { narrow: 'Narrow', normal: 'Normal', wide: 'Wide' };
const WIDTH_CH: Record<(typeof WIDTHS)[number], number> = { narrow: 30, normal: 60, wide: 90 };

// What the 1 multiplier resolves to right now: the font's natural
// (line-height: normal) box at the current size - same thing 1rlh means in
// the CSS. Measured live because it isn't derivable from the font size
// (DepartureMono at 22px is 28px tall) and doesn't even scale linearly.
function naturalLineHeight() {
    const probe = document.createElement('div');

    probe.style.cssText = 'position:absolute;visibility:hidden;line-height:normal;width:100px';
    probe.textContent = 'Xg';
    document.body.appendChild(probe);

    const height = probe.getBoundingClientRect().height;

    probe.remove();

    return height;
}

export function Commands({ activeId, onActiveIdChange }: { activeId: string; onActiveIdChange: (id: string) => void }) {
    const { theme, setTheme } = useTheme();
    const { font, fontSize, lineHeight, width, setFont, setFontSize, setLineHeight, setWidth } = useFont();
    const { guides, setGuides } = useGuide();

    // mod+p - quick-open, VS Code/devtools style: jump straight to a note by
    // title, or start a new one. Built fresh every open, so titles are current
    function getQuickOpenCommands(): Command[] {
        const notes = listNotes();

        return [
            {
                id: 'new-note',
                label: 'New note',
                run: () => onActiveIdChange(createNote()),
            },
            ...notes.map((note) => ({
                id: `open-${note.id}`,
                label: note.title,
                hint: new Date(note.updatedAt).toLocaleDateString(),
                active: note.id === activeId,
                run: () => {
                    setActiveNote(note.id);
                    onActiveIdChange(note.id);
                },
            })),
        ];
    }

    // mod+shift+p - everything else: manage, customize, share
    function getCommands(): Command[] {
        const notes = listNotes();

        return [
            {
                id: 'delete-note',
                label: 'Delete note...',
                run: () =>
                    notes.map((note) => ({
                        id: `delete-${note.id}`,
                        label: note.title,
                        hint: new Date(note.updatedAt).toLocaleDateString(),
                        active: note.id === activeId,
                        run: () => {
                            if (!window.confirm(`Delete "${note.title}"?`)) {
                                return;
                            }

                            onActiveIdChange(deleteNote(note.id));
                        },
                    })),
            },
            {
                id: 'export-note',
                label: 'Export note',
                hint: 'download .txt',
                run: () => {
                    const title = notes.find((note) => note.id === activeId)?.title || 'note';
                    const blob = new Blob([noteContent(activeId)], { type: 'text/plain' });
                    const link = document.createElement('a');

                    link.href = URL.createObjectURL(blob);
                    link.download = `${title}.txt`;
                    link.click();

                    URL.revokeObjectURL(link.href);
                },
            },
            ...(['dark', 'light', 'system'] as Theme[]).map((mode) => ({
                id: `theme-${mode}`,
                label: `Theme: ${mode[0].toUpperCase()}${mode.slice(1)}`,
                active: theme === mode,
                run: () => setTheme(mode),
            })),
            {
                id: 'font',
                label: 'Font...',
                hint: FONTS.find((option) => option.id === font)?.label,
                run: () =>
                    FONTS.map((option) => ({
                        id: `font-${option.id}`,
                        label: option.label,
                        active: font === option.id,
                        run: () => setFont(option.id),
                    })),
            },
            {
                id: 'font-size',
                label: 'Font size...',
                hint: SIZES.find((option) => option.id === fontSize)?.label,
                run: () =>
                    SIZES.map((option) => ({
                        id: `font-size-${option.id}`,
                        label: option.label,
                        hint: `${sizesFor(font)[option.id]}px`,
                        active: fontSize === option.id,
                        run: () => setFontSize(option.id),
                    })),
            },
            {
                id: 'line-height',
                label: 'Line height...',
                hint: lineHeight,
                run: () => {
                    const natural = naturalLineHeight();

                    return LINE_HEIGHTS.map((option) => ({
                        id: `line-height-${option}`,
                        label: option,
                        // resolved for the current font and size
                        hint: `${+(natural * parseFloat(option)).toFixed(2)}px`,
                        active: lineHeight === option,
                        run: () => setLineHeight(option),
                    }));
                },
            },
            {
                id: 'width',
                label: 'Width...',
                hint: WIDTH_LABELS[width],
                run: () =>
                    WIDTHS.map((option) => ({
                        id: `width-${option}`,
                        label: WIDTH_LABELS[option],
                        hint: `${WIDTH_CH[option]}ch`,
                        active: width === option,
                        run: () => setWidth(option),
                    })),
            },
            {
                id: 'debug-guides',
                label: 'Debug guides...',
                hint: guides ? 'On' : 'Off',
                run: () => [
                    {
                        id: 'debug-guides-on',
                        label: 'On',
                        active: guides,
                        run: () => setGuides(true),
                    },
                    {
                        id: 'debug-guides-off',
                        label: 'Off',
                        active: !guides,
                        run: () => setGuides(false),
                    },
                ],
            },
            {
                id: 'copy-share-link',
                label: 'Copy share link',
                hint: 'with encoded url',
                run: async () => {
                    const url = `${location.origin}${location.pathname}#n:${await encodeNote(noteContent(activeId))}`;

                    await navigator.clipboard.writeText(url);
                },
            },
            {
                id: 'copy-note',
                label: 'Copy note',
                hint: 'to clipboard',
                run: async () => {
                    await navigator.clipboard.writeText(noteContent(activeId));
                },
            },
        ];
    }

    return <CommandPalette getCommands={getCommands} getQuickOpenCommands={getQuickOpenCommands} />;
}
