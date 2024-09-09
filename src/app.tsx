import { ThemeProvider } from '@/providers/theme-provider';
import { MenuProvider } from '@/providers/menu-provider';
import { Sidebar } from '@/components/sidebar/sidebar';
import { MenuButton } from '@/components/menu-button';
import { Editor } from '@/components/editor';

export default function App() {
    return (
        <ThemeProvider>
            <MenuProvider>
                <Sidebar />
                {/* <MenuButton /> */}
                <Editor />
            </MenuProvider>
        </ThemeProvider>
    );
}
