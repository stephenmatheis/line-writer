import classNames from 'classnames';
import { useMenu } from '@/providers/menu-provider';
import styles from './sidebar.module.scss';

export function Sidebar() {
    const { isSidebarOpen, setIsSidebarOpen } = useMenu();

    return (
        <div
            className={classNames(styles.sidebar, {
                [styles.open]: isSidebarOpen,
            })}
        >
            <button
                className={styles.btn}
                onClick={() => setIsSidebarOpen((prev) => !prev)}
            >
                <div className={styles.icon} />
            </button>
            <div className={styles.items}>
                <div className={styles.item}>Test</div>
                <div className={styles.item}>Test</div>
                <div className={styles.item}>Test</div>
                <div className={styles.item}>Test</div>
                <div className={styles.item}>Test</div>
            </div>
        </div>
    );
}
