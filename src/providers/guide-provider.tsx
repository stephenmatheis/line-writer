/* oxlint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, ReactNode } from 'react';

type GuideContextType = {
    guides: boolean;
    setGuides: (guides: boolean) => void;
};

const GuideContext = createContext<GuideContextType | undefined>(undefined);

export function useGuide() {
    const context = useContext(GuideContext);

    if (!context) {
        throw new Error('useGuide must be used within a GuideProvider');
    }

    return context;
}

export function GuideProvider({ children }: { children: ReactNode }) {
    const [guides, setGuidesState] = useState<boolean>(() => localStorage.getItem('debug-guides') === 'true');

    function setGuides(next: boolean) {
        localStorage.setItem('debug-guides', String(next));

        document.documentElement.setAttribute('data-debug-guides', String(next));

        setGuidesState(next);
    }

    return <GuideContext.Provider value={{ guides, setGuides }}>{children}</GuideContext.Provider>;
}
