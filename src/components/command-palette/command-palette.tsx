import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import styles from './command-palette.module.scss';

export type Command = {
    id: string;
    label: string;
    hint?: string;
    active?: boolean;
    run: () => void | Promise<void>;
};

// Case-insensitive subsequence match: every query char must appear in the
// label, in order, but not necessarily adjacent. Returns which label indexes
// matched plus a score that favors word starts and consecutive runs.
function fuzzyMatch(query: string, label: string) {
    const q = query.toLowerCase();
    const l = label.toLowerCase();
    const positions: number[] = [];
    let score = 0;
    let from = 0;

    for (const char of q) {
        const index = l.indexOf(char, from);

        if (index === -1) {
            return null;
        }

        if (index === 0 || l[index - 1] === ' ') {
            score += 2;
        }

        if (positions.length && index === positions[positions.length - 1] + 1) {
            score += 1;
        }

        positions.push(index);
        from = index + 1;
    }

    return { positions, score };
}

export function CommandPalette({ commands }: { commands: Command[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const matches = query
        ? commands
              .flatMap((command) => {
                  const match = fuzzyMatch(query, command.label);

                  return match ? [{ command, ...match }] : [];
              })
              .sort((a, b) => b.score - a.score)
        : commands.map((command) => ({ command, positions: [] as number[] }));

    // typing can shrink the list out from under the selection
    const selectedIndex = Math.min(selected, matches.length - 1);

    // reset the query in the same render that opens, not an effect later -
    // an effect leaves a frame where typing appends to the previous query
    function open() {
        setQuery('');
        setSelected(0);
        setIsOpen(true);
    }

    useEffect(() => {
        function onKeyDown(event: globalThis.KeyboardEvent) {
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
                event.preventDefault();

                if (isOpen) {
                    setIsOpen(false);
                } else {
                    open();
                }
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    });

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        } else {
            document.getElementById('editor')?.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        listRef.current?.querySelector('[data-selected]')?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex, query]);

    function runCommand(command: Command) {
        setIsOpen(false);

        void command.run();
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Escape') {
            event.preventDefault();
            setIsOpen(false);
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();

            if (matches.length) {
                const step = event.key === 'ArrowDown' ? 1 : -1;

                setSelected((selectedIndex + step + matches.length) % matches.length);
            }
        } else if (event.key === 'Enter') {
            event.preventDefault();

            if (matches[selectedIndex]) {
                runCommand(matches[selectedIndex].command);
            }
        }
    }

    function renderLabel(label: string, positions: number[]) {
        if (!positions.length) {
            return label;
        }

        const hits = new Set(positions);

        return [...label].map((char, index) =>
            hits.has(index) ? (
                <span key={index} className={styles.hit}>
                    {char}
                </span>
            ) : (
                char
            ),
        );
    }

    if (!isOpen) {
        return null;
    }

    return createPortal(
        <div
            className={styles.backdrop}
            data-no-refocus
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    setIsOpen(false);
                }
            }}
        >
            <div className={styles.palette}>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    placeholder="Type a command..."
                    spellCheck={false}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setSelected(0);
                    }}
                    onKeyDown={handleKeyDown}
                />
                <div ref={listRef} className={styles.list}>
                    {matches.length === 0 && <div className={styles.empty}>No matching commands</div>}
                    {matches.map(({ command, positions }, index) => (
                        <div
                            key={command.id}
                            className={classNames(styles.item, {
                                [styles.selected]: index === selectedIndex,
                                [styles.filtered]: query.length > 0,
                            })}
                            data-selected={index === selectedIndex || undefined}
                            onMouseEnter={() => setSelected(index)}
                            onClick={() => runCommand(command)}
                        >
                            <span className={styles.label}>{renderLabel(command.label, positions)}</span>
                            {command.active && <span className={styles.active}>●</span>}
                            {command.hint && <span className={styles.hint}>{command.hint}</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body,
    );
}
