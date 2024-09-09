import styles from './sidebar.module.scss';

export function Sidebar() {
    return (
        <div className={styles.sidebar}>
            <div className={styles.icon}>
                <div className={styles.line} />
            </div>
        </div>
    );
}
