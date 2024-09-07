import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './modal.module.scss';

type ModalProps = {
    children?: React.ReactNode;
    onClose?: () => void;
};

export function Modal({ children, onClose }: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClose(event: MouseEvent) {
            if (
                modalRef.current &&
                !modalRef.current.contains(event.target as Node)
            ) {
                console.log('close');

                if (onClose) {
                    onClose();
                }
            }
        }

        const timer = setTimeout(() => {
            window.addEventListener('click', handleClose);
        }, 0);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('click', handleClose);
        };
    }, [onClose]);

    return (
        <>
            {createPortal(
                <div className={styles.overlay}>
                    <div className={styles.modal} ref={modalRef}>
                        <button className={styles.close} onClick={onClose}>
                            <div className={styles.bar} />
                            <div className={styles.bar} />
                        </button>
                        <div className={styles.content}>{children}</div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
