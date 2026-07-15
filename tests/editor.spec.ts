import { test, expect } from '@playwright/test';
import { seedNote, caretState, openPalette, runCommand } from './utils';

const TWELVE_LINES = Array.from({ length: 12 }, (_, i) => `line number ${i + 1}`).join('\n');

test.describe('typewriter editor', () => {
    test('on load the caret sits at the end, last line dark and centered', async ({ page }) => {
        await seedNote(page, TWELVE_LINES);

        const state = await caretState(page);

        expect(state.spanText).toBe('line number 12');
        expect(Math.abs(state.offCenter)).toBeLessThan(1);
    });

    test('editing mid-document highlights and centers that line', async ({ page }) => {
        await seedNote(page, TWELVE_LINES);

        await page.evaluate(() => {
            const textArea = document.querySelector('textarea#editor') as HTMLTextAreaElement;
            const startOfLineFour = textArea.value.split('\n').slice(0, 3).join('\n').length + 1;

            textArea.focus();
            textArea.setSelectionRange(startOfLineFour, startOfLineFour);
        });
        await page.keyboard.type('EDIT ');

        const state = await caretState(page);

        expect(state.spanText).toBe('EDIT line number 4\n');
        expect(Math.abs(state.offCenter)).toBeLessThan(1);
    });

    test('a soft-wrapped paragraph highlights only the caret segment', async ({ page }) => {
        await seedNote(page, TWELVE_LINES);

        // pin a narrow width so this line reliably wraps regardless of the
        // default editor width
        await openPalette(page);
        await runCommand(page, 'width...');
        await runCommand(page, 'narrow');

        const paragraph = 'alpha bravo charlie delta echo foxtrot golf';

        await page.keyboard.type('\n' + paragraph);

        const state = await caretState(page);

        expect(state.spanText).not.toBeNull();
        expect(state.spanText!.length).toBeLessThan(paragraph.length);
        expect(paragraph.endsWith(state.spanText!.trimStart())).toBe(true);
        expect(Math.abs(state.offCenter)).toBeLessThan(1);
    });

    test('Enter at the end mutes everything (blank active line)', async ({ page }) => {
        await seedNote(page, TWELVE_LINES);

        await page.keyboard.press('Enter');

        const state = await caretState(page);

        expect(state.spanText).toBe('');
        expect(Math.abs(state.offCenter)).toBeLessThan(1);
    });

    test('the textarea grows and shrinks with content', async ({ page }) => {
        await seedNote(page, '');

        const lines = () =>
            page.evaluate(() => {
                const textArea = document.querySelector('textarea#editor') as HTMLTextAreaElement;

                return textArea.clientHeight / parseFloat(getComputedStyle(textArea).lineHeight);
            });

        await page.keyboard.type('one\ntwo\nthree');
        expect(await lines()).toBe(3);

        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Delete');
        await page.keyboard.type('tiny');
        expect(await lines()).toBe(1);
    });

    test('focus line color differs from muted text in both themes', async ({ page }) => {
        await seedNote(page, TWELVE_LINES);

        for (const theme of ['light', 'dark']) {
            await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);

            const state = await caretState(page);

            expect(state.spanColor, `${theme} theme`).not.toBeNull();
            expect(state.spanColor, `${theme} theme`).not.toBe(state.overlayColor);
        }
    });
});
