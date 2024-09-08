import { useTheme, Theme } from '@/providers/theme-provider';
import classNames from 'classnames';
import styles from './customization.module.scss';

export function Customization() {
    const { theme, setTheme } = useTheme();

    return (
        <div className={styles.customization}>
            <div className={styles.label}>Theme</div>
            <div>
                <div className={styles.type}>
                    {['system', 'light', 'dark'].map((mode) => {
                        return (
                            <button
                                key={mode}
                                className={classNames(styles.btn, {
                                    [styles.selected]: theme === mode,
                                })}
                                onClick={() => setTheme(mode as Theme)}
                            >
                                <span className={styles.name}>{mode}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
