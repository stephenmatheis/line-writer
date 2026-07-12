import { useEffect, useRef, useState } from 'react';
import { ThemeProvider } from '@/providers/theme-provider';
import { ColorProvider } from '@/providers/color-provider';
import { FontProvider } from '@/providers/font-provider';
import { GuideProvider } from '@/providers/guide-provider';
import { AIProvider } from '@/providers/ai-provider';
import { Editor } from '@/components/editor';
import { Commands } from '@/components/commands';
import { decodeNote } from '@/lib/share';
import { createNote, ensureNotes } from '@/lib/notes';

export default function App() {
    const [activeId, setActiveId] = useState(() => ensureNotes());
    const [ready, setReady] = useState(() => !location.hash.startsWith('#n:'));
    const [fontsReady, setFontsReady] = useState(false);
    const importStarted = useRef(false);

    useEffect(() => {
        async function waitForFontsToBeLoaded() {
            await document.fonts.ready;

            setFontsReady(true);
        }

        waitForFontsToBeLoaded();
    }, []);

    useEffect(() => {
        if (ready || importStarted.current) return;

        importStarted.current = true;

        async function loadNote() {
            try {
                const imported = await decodeNote(location.hash.slice('#n:'.length));

                setActiveId(createNote(imported));
            } catch (error) {
                console.error('Error loading note.', error);
            }

            history.replaceState(null, '', location.pathname + location.search);

            setReady(true);
        }

        loadNote();
    }, [ready]);

    return (
        <ThemeProvider>
            <ColorProvider>
                <FontProvider>
                    <GuideProvider>
                        {ready && fontsReady && (
                            <AIProvider>
                                <Editor key={activeId} noteId={activeId} />
                            </AIProvider>
                        )}
                        <Commands activeId={activeId} onActiveIdChange={setActiveId} />
                    </GuideProvider>
                </FontProvider>
            </ColorProvider>
        </ThemeProvider>
    );
}
