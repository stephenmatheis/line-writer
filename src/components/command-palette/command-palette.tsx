import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import styles from './command-palette.module.scss';

export type Command = {
    id: string;
    label: string;
    hint?: string;
    active?: boolean;
    run: () => void | Promise<void> | Command[];
};

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

type CommandPaletteProps = {
    // build commands list on open so they're always fresh (note titles change with every keystroke)
    getCommands: () => Command[];
};

export function CommandPalette({ getCommands }: CommandPaletteProps) {
    const [isOpen, setIsOpen] = useState(false);
    // a stack of lists: drilling into a sub-list pushes, escape pops, and
    // escape on the last one closes the palette
    const [stack, setStack] = useState<Command[][]>([]);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const commandList = stack[stack.length - 1] ?? [];

    const matches = query
        ? commandList
              .flatMap((command) => {
                  const match = fuzzyMatch(query, command.label);

                  return match ? [{ command, ...match }] : [];
              })
              .sort((a, b) => b.score - a.score)
        : commandList.map((command) => ({ command, positions: [] as number[] }));

    // typing can shrink the list out from under the selection
    const selectedIndex = Math.min(selected, matches.length - 1);

    // reset the query in the same render that opens, not an effect later -
    // an effect leaves a frame where typing appends to the previous query
    function open() {
        setStack([getCommands()]);
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
        const result = command.run();

        // drill into a sub-list instead of closing
        if (Array.isArray(result)) {
            setStack([...stack, result]);
            setQuery('');
            setSelected(0);

            // a mouse click's mousedown already blurred the input (it's a
            // non-focusable row), before this onClick even ran - reclaim
            // focus so typing and Escape keep working on the sub-list
            inputRef.current?.focus();

            return;
        }

        setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Escape') {
            event.preventDefault();

            // back out of a sub-list first; only close from the top level
            if (stack.length > 1) {
                setStack(stack.slice(0, -1));
                setQuery('');
                setSelected(0);
            } else {
                setIsOpen(false);
            }

            return;
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();

            if (matches.length) {
                const step = event.key === 'ArrowDown' ? 1 : -1;

                setSelected((selectedIndex + step + matches.length) % matches.length);
            }

            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();

            if (matches[selectedIndex]) {
                runCommand(matches[selectedIndex].command);
            }

            return;
        }
    }

    function renderLabel(label: string, positions: number[]) {
        if (!positions.length) {
            return label;
        }

        const hits = new Set(positions);

        // split('') walks the label the same way fuzzyMatch counted it (by code
        // unit), so the hit positions line up even if a label ever gets an emoji
        return label.split('').map((char, index) =>
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
                <div className={styles.field}>
                    <span>❭</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setSelected(0);
                        }}
                        onKeyDown={handleKeyDown}
                    />
                </div>
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
                            {command.active && <span className={styles.active}>←</span>}
                            {command.hint && <span className={styles.hint}>{command.hint}</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body,
    );
}
