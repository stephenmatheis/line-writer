import { Editor } from '@/components/editor';
import { ThemeProvider } from './providers/theme-provider';

export default function App() {
    return (
        <ThemeProvider>
            <Editor />
        </ThemeProvider>
    );
}
