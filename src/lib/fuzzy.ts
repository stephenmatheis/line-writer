// Case-insensitive subsequence match: every char of `query` must appear in
// `label`, in order, but not necessarily adjacent. Score favors word starts
// and consecutive runs, so "cn" ranks "Copy note" above "Continue".
export function fuzzyMatch(query: string, label: string) {
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
