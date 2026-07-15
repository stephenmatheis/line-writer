import classNames from 'classnames';
import { useStatus } from '@/providers/status-provider';
import styles from './status-line.module.scss';

// The app's one notification surface: a single line of text at the bottom
// center that fades in, sits for a few seconds, and fades back out. The
// element is always in the DOM (empty and invisible when idle) so the
// opacity transition has something to run against on the first message.
export function StatusLine() {
    const { message, visible } = useStatus();

    return (
        <div
            className={classNames(styles.status, {
                [styles.visible]: visible,
                [styles.error]: message?.kind === 'error',
            })}
            role={message?.kind === 'error' ? 'alert' : 'status'}
        >
            {message?.text}
        </div>
    );
}
