import styles from './statusbar.module.scss';

export function StatusBar({ content }: { content: string }) {
    const chars = content.length;
    const words = content
        .trim()
        .split(/\s+/)
        .filter((x) => x).length;
    const sentences = content
        .trim()
        .split(/([^.!?]+[.!?])/g)
        .filter((x) => x).length;

    return (
        <div className={styles.statusbar}>
            <div className={styles.item}>
                Characters: <span>{chars}</span>
            </div>
            <div className={styles.item}>
                Words: <span>{words}</span>
            </div>
            <div className={styles.item}>
                Sentences: <span>{sentences}</span>
            </div>
        </div>
    );
}
