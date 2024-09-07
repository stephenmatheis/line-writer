import { useState } from 'react';
import { Modal } from '@/components/modal';
import styles from './menu-button.module.scss';

export function MenuButton() {
    const [open, setOpen] = useState<boolean>(false);

    return (
        <>
            <div className={styles['menu-button']}>
                <button className={styles.btn} onClick={() => setOpen(true)}>
                    <div className={styles.bar} />
                    <div className={styles.bar} />
                    <div className={styles.bar} />
                </button>
            </div>
            {open && <Modal onClose={() => setOpen(false)}>Test</Modal>}
        </>
    );
}
