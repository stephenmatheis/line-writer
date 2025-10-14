import { ThemeProvider } from '@/providers/theme-provider';
import { MenuProvider } from '@/providers/menu-provider';
// import { Sidebar } from '@/components/sidebar/sidebar';
// import { Menu } from '@/components/menu';
import { Editor } from '@/components/editor';
import { CommandPalette } from '@/components/command-palette';
import { AuthProvider } from '@/providers/auth-provider';

export default function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <MenuProvider>
                    {/* <Sidebar /> */}
                    {/* <Menu /> */}
                    <Editor />
                    <CommandPalette />
                </MenuProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}
