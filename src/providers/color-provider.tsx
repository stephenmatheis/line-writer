/* oxlint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, ReactNode } from 'react';

export type ColorScheme = 'mono' | 'warm' | 'cool';

export const COLOR_SCHEMES: ColorScheme[] = ['mono', 'warm', 'cool'];

type ColorContextType = {
    color: ColorScheme;
    setColor: (color: ColorScheme) => void;
};

const ColorContext = createContext<ColorContextType | undefined>(undefined);

export function useColor() {
    const context = useContext(ColorContext);

    if (!context) {
        throw new Error('useColor must be used within a ColorProvider');
    }

    return context;
}

// The attribute goes on <html> synchronously in the setter, not in an
// effect, so anything measuring computed color right after (e.g. selection
// highlight color) already sees the new scheme applied.
export function ColorProvider({ children }: { children: ReactNode }) {
    const [color, setColorState] = useState<ColorScheme>(
        () => (localStorage.getItem('color') as ColorScheme) || 'mono',
    );

    function setColor(next: ColorScheme) {
        localStorage.setItem('color', next);
        document.documentElement.setAttribute('data-color', next);
        setColorState(next);
    }

    return <ColorContext.Provider value={{ color, setColor }}>{children}</ColorContext.Provider>;
}
