import { useEffect, useState, useRef } from 'react';
import { useMenu } from '@/providers/menu-provider';
import { Modal } from '@/components/modal';
import { Customization } from '@/components/customization';
import styles from './menu.module.scss';
import classNames from 'classnames';
import { useAuth } from '@/providers/auth-provider';
import { SigninForm } from '@/components/signin-form';

export function Menu() {
    const [isSettingsModalOpen, setIsSettingsModalOpen] =
        useState<boolean>(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    const {
        hideChars,
        setHideChars,
        hideWords,
        setHideWords,
        hideSentences,
        setHideSentences,
    } = useMenu();
    const { session, supabase } = useAuth();
    const [selectedSetting, setSelectedSetting] =
        useState<string>('Customization');

    const btnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        function handleClose(event: MouseEvent) {
            if (
                btnRef.current &&
                !btnRef.current.contains(event.target as Node)
            ) {
                setIsMenuOpen(false);
            }
        }

        if (isMenuOpen) {
            window.addEventListener('click', handleClose);
        }

        return () => {
            window.removeEventListener('click', handleClose);
        };
    }, [isMenuOpen]);

    return (
        <>
            <div className={styles.menu}>
                <button
                    ref={btnRef}
                    className={styles.btn}
                    onClick={() => setIsMenuOpen((prev) => !prev)}
                >
                    <div className={styles.bar} />
                    <div className={styles.bar} />
                    <div className={styles.bar} />
                </button>
                {isMenuOpen && (
                    <div className={styles.list}>
                        <div
                            className={styles.item}
                            onClick={() => {
                                setHideChars((prev) => {
                                    const newValue = !prev;

                                    localStorage.setItem(
                                        'hideChars',
                                        newValue.toString()
                                    );

                                    return newValue;
                                });
                            }}
                        >
                            <div className={styles.icon}>
                                <svg
                                    className={classNames({
                                        [styles.hide]: !hideChars,
                                    })}
                                    width="16"
                                    height="16"
                                    fill="currentColor"
                                    viewBox="0 0 16 16"
                                >
                                    <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z" />
                                </svg>
                            </div>
                            <div className={styles.label}>
                                Hide character count
                            </div>
                        </div>
                        <div
                            className={styles.item}
                            onClick={() => {
                                setHideWords((prev) => {
                                    const newValue = !prev;

                                    localStorage.setItem(
                                        'hideWords',
                                        newValue.toString()
                                    );

                                    return newValue;
                                });
                            }}
                        >
                            <div className={styles.icon}>
                                <svg
                                    className={classNames({
                                        [styles.hide]: !hideWords,
                                    })}
                                    width="16"
                                    height="16"
                                    fill="currentColor"
                                    viewBox="0 0 16 16"
                                >
                                    <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z" />
                                </svg>
                            </div>
                            <div className={styles.label}>Hide word count</div>
                        </div>
                        <div
                            className={styles.item}
                            onClick={() => {
                                setHideSentences((prev) => {
                                    const newValue = !prev;

                                    localStorage.setItem(
                                        'hideSentences',
                                        newValue.toString()
                                    );

                                    return newValue;
                                });
                            }}
                        >
                            <div className={styles.icon}>
                                <svg
                                    className={classNames({
                                        [styles.hide]: !hideSentences,
                                    })}
                                    width="16"
                                    height="16"
                                    fill="currentColor"
                                    viewBox="0 0 16 16"
                                >
                                    <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z" />
                                </svg>
                            </div>
                            <div className={styles.label}>
                                Hide sentence count
                            </div>
                        </div>
                        <hr />
                        <div
                            className={styles.item}
                            onClick={() => setIsSettingsModalOpen(true)}
                        >
                            <div className={styles.icon}>
                                <svg
                                    width="16"
                                    height="16"
                                    fill="currentColor"
                                    viewBox="0 0 16 16"
                                >
                                    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0" />
                                    <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z" />
                                </svg>
                            </div>
                            <div className={styles.label}>Settings</div>
                        </div>
                        <hr />
                        <div
                            className={classNames(styles.item, {
                                [styles.red]: session,
                            })}
                            onClick={async () => {
                                if (session === null) {
                                    setIsAuthModalOpen(true);

                                    return;
                                }

                                // TODO:
                                // Sign out;
                                const { error } = await supabase.auth.signOut({
                                    scope: 'local',
                                });

                                console.log(error);
                            }}
                        >
                            <div className={styles.icon}>
                                <svg
                                    width="16"
                                    height="16"
                                    fill="currentColor"
                                    viewBox="0 0 16 16"
                                >
                                    {session === null ? (
                                        <>
                                            <path
                                                fillRule="evenodd"
                                                d="M6 3.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 0-1 0v2A1.5 1.5 0 0 0 6.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-8A1.5 1.5 0 0 0 5 3.5v2a.5.5 0 0 0 1 0z"
                                            />
                                            <path
                                                fillRule="evenodd"
                                                d="M11.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H1.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <path
                                                fillRule="evenodd"
                                                d="M6 12.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v2a.5.5 0 0 1-1 0v-2A1.5 1.5 0 0 1 6.5 2h8A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 5 12.5v-2a.5.5 0 0 1 1 0z"
                                            />
                                            <path
                                                fillRule="evenodd"
                                                d="M.146 8.354a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L1.707 7.5H10.5a.5.5 0 0 1 0 1H1.707l2.147 2.146a.5.5 0 0 1-.708.708z"
                                            />
                                        </>
                                    )}
                                </svg>
                            </div>
                            <div className={styles.label}>
                                Sign {session === null ? 'in' : 'out'}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {isSettingsModalOpen && (
                <Modal onClose={() => setIsSettingsModalOpen(false)}>
                    <div className={styles.ctr}>
                        <h2 className={styles.title}>Settings</h2>
                        <div className={styles.panel}>
                            <div className={styles.sidebar}>
                                <div
                                    className={classNames(styles.item, {
                                        [styles.selected]:
                                            selectedSetting === 'Customization',
                                    })}
                                    onClick={() =>
                                        setSelectedSetting('Customization')
                                    }
                                >
                                    Customization
                                </div>
                                <div
                                    className={classNames(styles.item, {
                                        [styles.selected]:
                                            selectedSetting === 'General',
                                    })}
                                    onClick={() =>
                                        setSelectedSetting('General')
                                    }
                                >
                                    General
                                </div>

                                <div
                                    className={classNames(styles.item, {
                                        [styles.selected]:
                                            selectedSetting === 'Account',
                                    })}
                                    onClick={() =>
                                        setSelectedSetting('Account')
                                    }
                                >
                                    Account
                                </div>
                            </div>
                            <div className={styles.content}>
                                {selectedSetting === 'Customization' && (
                                    <Customization />
                                )}
                                {selectedSetting === 'General' && (
                                    <div>
                                        <div className={styles.label}>
                                            General content
                                        </div>
                                        <div>Location</div>
                                        <div>Units</div>
                                    </div>
                                )}

                                {selectedSetting === 'Account' && (
                                    <div>
                                        <div className={styles.label}>
                                            Account content
                                        </div>
                                        <div>Name</div>
                                        <div>Email</div>
                                        <div>Password</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
            {isAuthModalOpen && (
                <Modal onClose={() => setIsAuthModalOpen(false)}>
                    <div className={styles.ctr}>
                        <SigninForm />
                    </div>
                </Modal>
            )}
        </>
    );
}
