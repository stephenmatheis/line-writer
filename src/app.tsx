import { useEffect, useRef, useState } from 'react';
import { Editor } from '@/components/editor';
import { CommandPalette, Command } from '@/components/command-palette';
import { ThemeProvider, useTheme, Theme } from './providers/theme-provider';
import { FontProvider, useFont, Font, FontSize, LineHeight } from './providers/font-provider';
import { decodeNote, encodeNote } from '@/lib/share';
import { createNote, deleteNote, ensureNotes, listNotes, noteContent, setActiveNote } from '@/lib/notes';

const FONTS: { id: Font; label: string }[] = [
    { id: 'departure-mono', label: 'Departure Mono' },
    { id: 'pureprog', label: 'PureProg' },
    { id: 'paper-mono', label: 'Paper Mono' },
    { id: 'monospace', label: 'System monospace' },
];

const SIZES: { id: FontSize; label: string; px: string }[] = [
    { id: 'small', label: 'Small', px: '18px' },
    { id: 'medium', label: 'Medium', px: '22px' },
    { id: 'large', label: 'Large', px: '26px' },
];

const LINE_HEIGHTS: { id: LineHeight; label: string; px: string }[] = [
    { id: 'compact', label: 'Compact', px: '36px' },
    { id: 'normal', label: 'Normal', px: '48px' },
    { id: 'relaxed', label: 'Relaxed', px: '64px' },
];

function Commands({ activeId, onActiveIdChange }: { activeId: string; onActiveIdChange: (id: string) => void }) {
    const { theme, setTheme } = useTheme();
    const { font, fontSize, lineHeight, setFont, setFontSize, setLineHeight } = useFont();

    // built fresh every time the palette opens, so note titles are current
    function getCommands(): Command[] {
        const notes = listNotes();

        return [
            {
                id: 'new-note',
                label: 'New note',
                run: () => onActiveIdChange(createNote()),
            },
            {
                id: 'open-note',
                label: 'Open note...',
                hint: `${notes.length} note${notes.length === 1 ? '' : 's'}`,
                run: () =>
                    notes.map((note) => ({
                        id: `open-${note.id}`,
                        label: note.title,
                        hint: new Date(note.updatedAt).toLocaleDateString(),
                        active: note.id === activeId,
                        run: () => {
                            setActiveNote(note.id);
                            onActiveIdChange(note.id);
                        },
                    })),
            },
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
                        hint: option.px,
                        active: fontSize === option.id,
                        run: () => setFontSize(option.id),
                    })),
            },
            {
                id: 'line-height',
                label: 'Line height...',
                hint: LINE_HEIGHTS.find((option) => option.id === lineHeight)?.label,
                run: () =>
                    LINE_HEIGHTS.map((option) => ({
                        id: `line-height-${option.id}`,
                        label: option.label,
                        hint: option.px,
                        active: lineHeight === option.id,
                        run: () => setLineHeight(option.id),
                    })),
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

    return <CommandPalette getCommands={getCommands} />;
}

export default function App() {
    const [activeId, setActiveId] = useState(() => ensureNotes());
    const [ready, setReady] = useState(() => !location.hash.startsWith('#n:'));
    const importStarted = useRef(false);

    // A share link arrived: decode it before the editor mounts. The shared
    // note comes in as its own new note - never on top of something you
    // already wrote
    useEffect(() => {
        if (ready || importStarted.current) return;

        importStarted.current = true;

        // void: we kick this off and don't wait on it; errors are handled inside
        void (async () => {
            try {
                const imported = await decodeNote(location.hash.slice('#n:'.length));

                setActiveId(createNote(imported));
            } catch {
                // bad or truncated payload - keep what we have
            }

            history.replaceState(null, '', location.pathname + location.search);

            setReady(true);
        })();
    }, [ready]);

    return (
        <ThemeProvider>
            <FontProvider>
                {ready && <Editor key={activeId} noteId={activeId} />}
                <Commands activeId={activeId} onActiveIdChange={setActiveId} />
            </FontProvider>
        </ThemeProvider>
    );
}
