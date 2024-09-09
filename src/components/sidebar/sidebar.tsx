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
                className={styles.open}
                onClick={() => setIsSidebarOpen((prev) => !prev)}
            >
                <div className={styles.icon} />
            </button>
        </div>
    );
}
