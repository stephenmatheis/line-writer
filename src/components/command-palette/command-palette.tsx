import { useEffect, useState } from 'react';
import styles from './command-palette.module.scss';

export function CommandPalette() {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    useEffect(() => {
        function open(event: KeyboardEvent) {
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key == 'p') {
                event.preventDefault();
                setIsOpen(true);

                return;
            }

            if (event.key == 'Escape') {
                event.preventDefault();
                setIsOpen(false);
            }
        }

        window.addEventListener('keydown', open);

        return () => window.removeEventListener('keydown', open);
    }, []);

    return (
        <>
            {isOpen && (
                <div className={styles['command-palette']}>
                    <div className={styles.palette}>Test</div>
                </div>
            )}
        </>
    );
}
