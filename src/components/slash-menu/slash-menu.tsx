import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { fuzzyMatch } from '@/lib/fuzzy';
import { useAI, type Action } from '@/providers/ai-provider';
import styles from './slash-menu.module.scss';

const ACTIONS: { id: Action; label: string; hint: string }[] = [
    { id: 'continue', label: 'Continue writing', hint: '' },
    { id: 'rewrite', label: 'Rewrite selection', hint: 'No selection' },
    { id: 'fix-grammar', label: 'Fix grammar', hint: 'No selection' },
];

export type SlashMenuHandle = {
    moveSelection: (direction: 1 | -1) => void;
    confirmSelection: () => void;
};

type SlashMenuProps = {
    // filter text, read live from the note content by the caller - the
    // menu itself owns no query state
    query: string;
    position: { top: number; left: number };
    disabledActions: Set<Action>;
    // true once an action has been picked and generation has been kicked
    // off but hasn't started streaming into the note yet
    isGenerating: boolean;
    onSelect: (action: Action) => void;
};

// Controlled by Editor (open/position/query all live there, since the
// trigger is textarea-local, not a global shortcut like CommandPalette).
// Arrow/Enter/Escape are intercepted by Editor's own keydown handler and
// forwarded here via the imperative handle, because the textarea itself
// must stay focused for typing after "/" to keep landing in the query.
export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(function SlashMenu(
    { query, position, disabledActions, isGenerating, onSelect },
    ref,
) {
    const { status, progress } = useAI();
    const [selected, setSelected] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    const matches = (
        query
            ? ACTIONS.flatMap((action) => {
                  const match = fuzzyMatch(query, action.label);

                  return match ? [{ action, ...match }] : [];
              }).sort((a, b) => b.score - a.score)
            : ACTIONS.map((action) => ({ action, positions: [] as number[] }))
    ).map((match) => ({ ...match, disabled: disabledActions.has(match.action.id) }));

    const selectedIndex = Math.min(selected, matches.length - 1);

    useImperativeHandle(ref, () => ({
        moveSelection(direction) {
            if (!matches.length) return;

            // step past disabled entries; bounded by matches.length so an
            // all-disabled list (never happens - "continue" is always
            // enabled) can't loop forever
            let next = selectedIndex;

            for (let i = 0; i < matches.length; i++) {
                next = (next + direction + matches.length) % matches.length;

                if (!matches[next].disabled) break;
            }

            setSelected(next);
            listRef.current?.querySelector('[data-selected]')?.scrollIntoView({ block: 'nearest' });
        },
        confirmSelection() {
            const match = matches[selectedIndex];

            if (match && !match.disabled) {
                onSelect(match.action.id);
            }
        },
    }));

    function renderLabel(label: string, positions: number[]) {
        if (!positions.length) return label;

        const hits = new Set(positions);

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

    return createPortal(
        <div className={styles.menu} data-no-refocus style={{ top: position.top, left: position.left }}>
            {isGenerating ? (
                <div className={styles.loading}>
                    {status === 'loading' ? `Downloading model… ${Math.round(progress)}%` : 'Generating…'}
                </div>
            ) : (
                <div ref={listRef} className={styles.list}>
                    {matches.map(({ action, positions, disabled }, index) => (
                        <div
                            key={action.id}
                            className={classNames(styles.item, {
                                [styles.selected]: index === selectedIndex,
                                [styles.disabled]: disabled,
                            })}
                            data-selected={index === selectedIndex || undefined}
                            onMouseEnter={() => !disabled && setSelected(index)}
                            onClick={() => !disabled && onSelect(action.id)}
                        >
                            <span className={styles.label}>{renderLabel(action.label, positions)}</span>
                            {disabled && <span className={styles.hint}>{action.hint}</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>,
        document.body,
    );
});
