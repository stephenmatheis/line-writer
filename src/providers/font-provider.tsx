/* oxlint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, ReactNode } from 'react';

export type Font = 'departure-mono' | 'pureprog' | 'paper-mono' | 'monospace';
export type FontSize = 'small' | 'medium' | 'large';
export type LineHeight = '1' | '1.25' | '1.5' | '2' | '3';
export type Width = 'narrow' | 'normal' | 'wide';

// unitless multipliers of the font size, like CSS line-height numbers
export const LINE_HEIGHTS: LineHeight[] = ['1', '1.25', '1.5', '2', '3'];
export const WIDTHS: Width[] = ['narrow', 'normal', 'wide'];

type FontContextType = {
    font: Font;
    fontSize: FontSize;
    lineHeight: LineHeight;
    width: Width;
    setFont: (font: Font) => void;
    setFontSize: (size: FontSize) => void;
    setLineHeight: (lineHeight: LineHeight) => void;
    setWidth: (width: Width) => void;
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
    const [lineHeight, setLineHeightState] = useState<LineHeight>(() => {
        const saved = localStorage.getItem('line-height');

        // older builds stored names like 'relaxed' - fall back to the default
        return LINE_HEIGHTS.includes(saved as LineHeight) ? (saved as LineHeight) : '2';
    });
    const [width, setWidthState] = useState<Width>(() => (localStorage.getItem('width') as Width) || 'normal');

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

    function setWidth(next: Width) {
        localStorage.setItem('width', next);
        document.documentElement.setAttribute('data-width', next);
        setWidthState(next);
    }

    return (
        <FontContext.Provider
            value={{ font, fontSize, lineHeight, width, setFont, setFontSize, setLineHeight, setWidth }}
        >
            {children}
        </FontContext.Provider>
    );
}
