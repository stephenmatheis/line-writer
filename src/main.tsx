import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StatusProvider } from './providers/status-provider.tsx';
import App from './app.tsx';
import './app.scss';

// StatusProvider sits above App (not inside it with the other providers)
// because App itself needs notify() for the share-link import error
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <StatusProvider>
            <App />
        </StatusProvider>
    </StrictMode>,
);
