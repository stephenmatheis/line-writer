/* oxlint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, ReactNode } from 'react';

type DebugContextType = {
    guides: boolean;
    setGuides: (guides: boolean) => void;
};

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function useDebug() {
    const context = useContext(DebugContext);

    if (!context) {
        throw new Error('useDebug must be used within a DebugProvider');
    }

    return context;
}

// Off by default - the red guide bar and tinted editor background are
// layout-debugging aids, not something a note-taking session should show.
export function DebugProvider({ children }: { children: ReactNode }) {
    const [guides, setGuidesState] = useState<boolean>(() => localStorage.getItem('debug-guides') === 'true');

    function setGuides(next: boolean) {
        localStorage.setItem('debug-guides', String(next));
        document.documentElement.setAttribute('data-debug-guides', String(next));
        setGuidesState(next);
    }

    return <DebugContext.Provider value={{ guides, setGuides }}>{children}</DebugContext.Provider>;
}
