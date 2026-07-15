import { useEffect, useRef, useState } from 'react';
import { ThemeProvider } from '@/providers/theme-provider';
import { ColorProvider } from '@/providers/color-provider';
import { FontProvider } from '@/providers/font-provider';
import { GuideProvider } from '@/providers/guide-provider';
import { Editor } from '@/components/editor';
import { Commands } from '@/components/commands';
import { StatusLine } from '@/components/status-line';
import { useStatus } from '@/providers/status-provider';
import { decodeNote } from '@/lib/share';
import { createNote, ensureNotes } from '@/lib/notes';

export default function App() {
    const { notify } = useStatus();
    const [activeId, setActiveId] = useState(() => ensureNotes());
    const [ready, setReady] = useState(() => !location.hash.startsWith('#n:'));
    const [fontsReady, setFontsReady] = useState(false);
    const importStarted = useRef(false);

    useEffect(() => {
        void (async () => {
            await document.fonts.ready;

            setFontsReady(true);
        })();
    }, []);

    useEffect(() => {
        if (ready || importStarted.current) return;

        importStarted.current = true;

        void (async () => {
            try {
                const imported = await decodeNote(location.hash.slice('#n:'.length));

                setActiveId(createNote(imported));
            } catch (error) {
                console.error('Error loading note.', error);

                // issue #4: without this, a bad link just showed whatever
                // note was already active and looked like a dead click
                notify("Couldn't open the share link - it looks broken or incomplete", 'error');
            }

            history.replaceState(null, '', location.pathname + location.search);

            setReady(true);
        })();
    }, [ready, notify]);

    return (
        <ThemeProvider>
            <ColorProvider>
                <FontProvider>
                    <GuideProvider>
                        {ready && fontsReady && <Editor key={activeId} noteId={activeId} />}
                        <Commands activeId={activeId} onActiveIdChange={setActiveId} />
                        <StatusLine />
                    </GuideProvider>
                </FontProvider>
            </ColorProvider>
        </ThemeProvider>
    );
}
