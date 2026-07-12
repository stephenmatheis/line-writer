import { useEffect, useRef, useState } from 'react';
import { Editor } from '@/components/editor';
import { CommandPalette, Command } from '@/components/command-palette';
import { ThemeProvider, useTheme, Theme } from './providers/theme-provider';
import { decodeNote, encodeNote } from '@/lib/share';

function Commands() {
    const { theme, setTheme } = useTheme();

    const commands: Command[] = [
        ...(['dark', 'light', 'system'] as Theme[]).map((mode) => ({
            id: `theme-${mode}`,
            label: `Theme: ${mode[0].toUpperCase()}${mode.slice(1)}`,
            active: theme === mode,
            run: () => setTheme(mode),
        })),
        {
            id: 'copy-share-link',
            label: 'Copy share link',
            hint: 'with encoded url',
            run: async () => {
                const note = localStorage.getItem('note') || '';
                const url = `${location.origin}${location.pathname}#n:${await encodeNote(note)}`;

                await navigator.clipboard.writeText(url);
            },
        },
        {
            id: 'copy-note',
            label: 'Copy note',
            hint: 'to clipboard',
            run: async () => {
                await navigator.clipboard.writeText(localStorage.getItem('note') || '');
            },
        },
    ];

    return <CommandPalette commands={commands} />;
}

export default function App() {
    const [ready, setReady] = useState(() => !location.hash.startsWith('#n:'));
    const importStarted = useRef(false);

    // A share link arrived: decode the note out of the hash before the editor
    // mounts, so the editor initializes from the already-updated localStorage
    useEffect(() => {
        if (ready || importStarted.current) return;

        importStarted.current = true;

        (async () => {
            try {
                const imported = await decodeNote(location.hash.slice('#n:'.length));
                const existing = localStorage.getItem('note') || '';

                if (
                    !existing ||
                    existing === imported ||
                    window.confirm('Replace your current note with the shared one?')
                ) {
                    localStorage.setItem('note', imported);
                }
            } catch {
                // bad or truncated payload - keep the existing note
            }

            history.replaceState(null, '', location.pathname + location.search);

            setReady(true);
        })();
    }, [ready]);

    return (
        <ThemeProvider>
            {ready && <Editor />}
            <Commands />
        </ThemeProvider>
    );
}
