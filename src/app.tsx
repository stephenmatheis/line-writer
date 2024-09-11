import { ThemeProvider } from '@/providers/theme-provider';
import { MenuProvider } from '@/providers/menu-provider';
import { Sidebar } from '@/components/sidebar/sidebar';
import { Menu } from '@/components/menu';
import { Editor } from '@/components/editor';
import { AuthProvider } from '@/providers/auth-provider';

export default function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <MenuProvider>
                    <Sidebar />
                    <Menu />
                    <Editor />
                </MenuProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}
