import { MenuButton } from '@/components/menu-button';
import { Editor } from '@/components/editor';
import { MenuProvider } from '@/providers/menu-provider';
import { ThemeProvider } from './providers/theme-provider';

export default function App() {
    return (
        <ThemeProvider>
            <MenuProvider>
                <MenuButton />
                <Editor />
            </MenuProvider>
        </ThemeProvider>
    );
}
