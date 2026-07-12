/* oxlint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, ReactNode } from 'react';

export type Font = 'departure-mono' | 'pureprog' | 'paper-mono' | 'monospace';
export type FontSize = 'small' | 'medium' | 'large';
export type LineHeight = 'compact' | 'normal' | 'relaxed';

type FontContextType = {
    font: Font;
    fontSize: FontSize;
    lineHeight: LineHeight;
    setFont: (font: Font) => void;
    setFontSize: (size: FontSize) => void;
    setLineHeight: (lineHeight: LineHeight) => void;
};

const FontContext = createContext<FontContextType | undefined>(undefined);

export function useFont() {
    const context = useContext(FontContext);

    if (!context) {
        throw new Error('useFont must be used within a FontProvider');
    }

    return context;
}

// The attribute goes on <html> synchronously in the setters, not in an
// effect, so anything measuring the page after the re-render - like the
// editor's caret centering - already sees the new font applied.
export function FontProvider({ children }: { children: ReactNode }) {
    const [font, setFontState] = useState<Font>(() => (localStorage.getItem('font') as Font) || 'departure-mono');
    const [fontSize, setFontSizeState] = useState<FontSize>(
        () => (localStorage.getItem('font-size') as FontSize) || 'medium',
    );
    const [lineHeight, setLineHeightState] = useState<LineHeight>(
        () => (localStorage.getItem('line-height') as LineHeight) || 'normal',
    );

    function setFont(next: Font) {
        localStorage.setItem('font', next);
        document.documentElement.setAttribute('data-font', next);
        setFontState(next);
    }

    function setFontSize(next: FontSize) {
        localStorage.setItem('font-size', next);
        document.documentElement.setAttribute('data-font-size', next);
        setFontSizeState(next);
    }

    function setLineHeight(next: LineHeight) {
        localStorage.setItem('line-height', next);
        document.documentElement.setAttribute('data-line-height', next);
        setLineHeightState(next);
    }

    return (
        <FontContext.Provider value={{ font, fontSize, lineHeight, setFont, setFontSize, setLineHeight }}>
            {children}
        </FontContext.Provider>
    );
}
