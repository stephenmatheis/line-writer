import { MenuButton } from '@/components/menu-button';
import { Editor } from '@/components/editor';
import { MenuProvider } from '@/providers/menu-provider';

export default function App() {
    return (
        <MenuProvider>
            <MenuButton />
            <Editor />
        </MenuProvider>
    );
}
