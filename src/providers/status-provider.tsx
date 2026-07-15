/* oxlint-disable react-refresh/only-export-components */

import { createContext, useContext, useRef, useState, ReactNode } from 'react';

export type StatusKind = 'info' | 'error';

type StatusMessage = { text: string; kind: StatusKind };

type StatusContextType = {
    message: StatusMessage | null;
    visible: boolean;
    notify: (text: string, kind?: StatusKind) => void;
};

// How long a message hangs around before fading. Errors stay up longer -
// a "Copied" you half-expected can flash by, but an "it broke" you weren't
// expecting needs time to get noticed.
const INFO_MS = 4000;
const ERROR_MS = 8000;

const StatusContext = createContext<StatusContextType | undefined>(undefined);

export function useStatus() {
    const context = useContext(StatusContext);

    if (!context) {
        throw new Error('useStatus must be used within a StatusProvider');
    }

    return context;
}

export function StatusProvider({ children }: { children: ReactNode }) {
    const [message, setMessage] = useState<StatusMessage | null>(null);
    const [visible, setVisible] = useState(false);
    const timer = useRef<number | undefined>(undefined);

    // One message at a time, newest wins - no stacking, no queue. Fading
    // out just drops opacity and leaves the old text in place, so the next
    // notify swaps the text and raises it again.
    function notify(text: string, kind: StatusKind = 'info') {
        clearTimeout(timer.current);

        setMessage({ text, kind });
        setVisible(true);

        timer.current = window.setTimeout(() => setVisible(false), kind === 'error' ? ERROR_MS : INFO_MS);
    }

    return <StatusContext.Provider value={{ message, visible, notify }}>{children}</StatusContext.Provider>;
}
