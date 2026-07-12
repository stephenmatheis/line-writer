/* oxlint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { Action, FromWorker, ToWorker } from '@/lib/ai-worker';

export type { Action };
export type AIStatus = 'idle' | 'loading' | 'ready' | 'error';

export type GenerateHandle = {
    id: string;
    promise: Promise<void>;
    cancel: () => void;
};

type AIContextType = {
    status: AIStatus;
    progress: number;
    generate: (action: Action, text: string, onChunk: (token: string) => void) => GenerateHandle;
};

const AIContext = createContext<AIContextType | undefined>(undefined);

export function useAI() {
    const context = useContext(AIContext);

    if (!context) {
        throw new Error('useAI must be used within an AIProvider');
    }

    return context;
}

type PendingRequest = {
    onChunk: (token: string) => void;
    resolve: () => void;
    reject: (error: Error) => void;
};

// One worker for the app's lifetime, holding the (lazily-loaded) model - so
// switching notes never re-downloads or re-initializes the pipeline.
export function AIProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<AIStatus>('idle');
    const [progress, setProgress] = useState(0);
    const workerRef = useRef<Worker | null>(null);
    const pendingRef = useRef(new Map<string, PendingRequest>());

    useEffect(() => {
        const worker = new Worker(new URL('../lib/ai-worker.ts', import.meta.url), { type: 'module' });

        worker.onmessage = (event: MessageEvent<FromWorker>) => {
            const message = event.data;

            if (message.type === 'load-progress') {
                setStatus('loading');
                setProgress(message.progress);

                return;
            }

            if (message.type === 'model-ready') {
                setStatus('ready');
                setProgress(100);

                return;
            }

            if (message.type === 'model-error') {
                setStatus('error');

                return;
            }

            // remaining message types are keyed to one in-flight generate() call
            const pending = pendingRef.current.get(message.id);

            if (!pending) return; // already settled (e.g. a stray late chunk)

            if (message.type === 'generate-chunk') {
                pending.onChunk(message.token);

                return;
            }

            if (message.type === 'generate-done') {
                pendingRef.current.delete(message.id);
                pending.resolve();

                return;
            }

            if (message.type === 'generate-error') {
                pendingRef.current.delete(message.id);
                pending.reject(new Error(message.message));

                return;
            }

            // cancellation isn't an error - whatever streamed so far stays
            pendingRef.current.delete(message.id);
            pending.resolve();
        };

        workerRef.current = worker;

        return () => {
            worker.terminate();
            workerRef.current = null;
        };
    }, []);

    function generate(action: Action, text: string, onChunk: (token: string) => void): GenerateHandle {
        const id = crypto.randomUUID();

        const promise = new Promise<void>((resolve, reject) => {
            pendingRef.current.set(id, { onChunk, resolve, reject });
        });

        const toWorker: ToWorker = { type: 'generate', id, action, text };

        workerRef.current?.postMessage(toWorker);

        return {
            id,
            promise,
            cancel: () => {
                const cancelMessage: ToWorker = { type: 'cancel', id };

                workerRef.current?.postMessage(cancelMessage);
            },
        };
    }

    return <AIContext.Provider value={{ status, progress, generate }}>{children}</AIContext.Provider>;
}
