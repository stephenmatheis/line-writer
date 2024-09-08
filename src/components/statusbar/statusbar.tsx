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
                <span style={{ width: '10ch' }}>Characters</span>{' '}
                <span>{chars.toLocaleString()}</span>
            </div>
            <div
                className={classNames(styles.item, {
                    [styles.hide]: hideWords,
                })}
            >
                <span style={{ width: '5ch' }}>Words</span>{' '}
                <span>{words.toLocaleString()}</span>
            </div>
            <div
                className={classNames(styles.item, {
                    [styles.hide]: hideSentences,
                })}
            >
                <span style={{ width: '9ch' }}>Sentences</span>{' '}
                <span>{sentences.toLocaleString()}</span>
            </div>
        </div>
    );
}
