import { useMenu } from '@/providers/menu-provider';
import styles from './statusbar.module.scss';
import classNames from 'classnames';

export function StatusBar({ content }: { content: string }) {
    const { hideChars, hideWords, hideSentences } = useMenu();
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
            <div
                className={classNames(styles.item, {
                    [styles.hide]: hideChars,
                })}
            >
                Characters <span>{chars.toLocaleString()}</span>
            </div>
            <div
                className={classNames(styles.item, {
                    [styles.hide]: hideWords,
                })}
            >
                Words <span>{words.toLocaleString()}</span>
            </div>
            <div
                className={classNames(styles.item, {
                    [styles.hide]: hideSentences,
                })}
            >
                Sentences <span>{sentences.toLocaleString()}</span>
            </div>
        </div>
    );
}
