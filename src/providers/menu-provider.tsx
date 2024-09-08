/* eslint-disable react-refresh/only-export-components */

import {
    createContext,
    Dispatch,
    SetStateAction,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from 'react';

type MenuProviderProps = {
    children?: ReactNode;
};

type ContextProps = {
    hideChars: boolean;
    setHideChars: Dispatch<SetStateAction<boolean>>;
    hideWords: boolean;
    setHideWords: Dispatch<SetStateAction<boolean>>;
    hideSentences: boolean;
    setHideSentences: Dispatch<SetStateAction<boolean>>;
};

const MenuContext = createContext<ContextProps | undefined>(undefined);

export function useMenu() {
    const context = useContext(MenuContext);

    if (!context) {
        throw new Error('usePopover must be used within a PopoverProvider');
    }

    return context;
}

export function MenuProvider({ children }: MenuProviderProps) {
    const [hideChars, setHideChars] = useState<boolean>(() => {
        const storedValue = localStorage.getItem('hideChars');

        return storedValue === 'true' ? true : false;
    });
    const [hideWords, setHideWords] = useState<boolean>(() => {
        const storedValue = localStorage.getItem('hideWords');

        return storedValue === 'true' ? true : false;
    });
    const [hideSentences, setHideSentences] = useState<boolean>(() => {
        const storedValue = localStorage.getItem('hideSentences');

        return storedValue === 'true' ? true : false;
    });

    useEffect(() => {
        localStorage.setItem('hideChars', hideChars.toString());
    }, [hideChars]);

    useEffect(() => {
        localStorage.setItem('hideWords', hideWords.toString());
    }, [hideWords]);

    useEffect(() => {
        localStorage.setItem('hideSentences', hideSentences.toString());
    }, [hideSentences]);

    return (
        <MenuContext.Provider
            value={{
                hideChars,
                setHideChars,
                hideWords,
                setHideWords,
                hideSentences,
                setHideSentences,
            }}
        >
            {children}
        </MenuContext.Provider>
    );
}
