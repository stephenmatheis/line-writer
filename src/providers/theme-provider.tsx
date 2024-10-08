/* eslint-disable react-refresh/only-export-components */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';

type ThemeContextType = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return context;
}

interface ThemeProviderProps {
    children: ReactNode;
}

function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('theme');

        return savedTheme ? (savedTheme as Theme) : 'system';
    });

    function setTheme(newTheme: Theme) {
        localStorage.setItem('theme', newTheme);

        setThemeState(newTheme);
    }

    useEffect(() => {
        function applyTheme(currentTheme: Theme) {
            const resolvedTheme =
                currentTheme === 'system' ? getSystemTheme() : currentTheme;
            document.documentElement.setAttribute('data-theme', resolvedTheme);
        }

        applyTheme(theme);

        if (theme === 'system') {
            const systemTheme = window.matchMedia(
                '(prefers-color-scheme: dark)'
            );

            function systemThemeHandler() {
                applyTheme('system');
            }

            systemTheme.addEventListener('change', systemThemeHandler);

            return () =>
                systemTheme.removeEventListener('change', systemThemeHandler);
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
