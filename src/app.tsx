import { ThemeProvider } from '@/providers/theme-provider';
import { MenuProvider } from '@/providers/menu-provider';
import { Editor } from '@/components/editor';
import { CommandPalette } from '@/components/command-palette';
import { AuthProvider } from '@/providers/auth-provider';

export default function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <MenuProvider>
                    <Editor />
                    <CommandPalette />
                </MenuProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}
