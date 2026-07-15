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

    // Issue #3: the highlight and centering used to only react to input, so
    // arrow keys and clicks left them stuck on the old line until the next
    // keystroke - which then landed somewhere that looked wrong.
    test('arrow keys alone move the highlight and re-center', async ({ page }) => {
        await seedNote(page, TWELVE_LINES);

        for (let i = 0; i < 3; i++) {
            await page.keyboard.press('ArrowUp');
        }

        // selectionchange is async, so the highlight lands a frame or two
        // after the keypress - poll for it, then the scroll (applied in the
        // same layout effect) can be asserted immediately
        await expect.poll(async () => (await caretState(page)).spanText).toBe('line number 9\n');
        expect(Math.abs((await caretState(page)).offCenter)).toBeLessThan(1);
    });

    test('clicking another line moves the highlight and re-centers', async ({ page }) => {
        await seedNote(page, TWELVE_LINES);

        // aim at line 5 using the real line grid (the highlight span's own
        // rect is the text box, not the 1lh-tall row, so don't measure that)
        const target = await page.evaluate(() => {
            const textArea = document.querySelector('textarea#editor') as HTMLTextAreaElement;
            const rect = textArea.getBoundingClientRect();
            const lineHeight = parseFloat(getComputedStyle(textArea).lineHeight);

            return { x: rect.left + 5, y: rect.top + 4 * lineHeight + lineHeight / 2 };
        });

        await page.mouse.click(target.x, target.y);

        expect((await caretState(page)).spanText).toBe('line number 5\n');

        // clicks re-center with an animated scroll (keyboard stays instant),
        // so poll until it settles instead of asserting mid-flight
        await expect.poll(async () => Math.abs((await caretState(page)).offCenter)).toBeLessThan(1);
    });

    // Issue #6: re-centering mid-drag scrolled the text out from under the
    // pointer, making click-and-drag selection nearly unusable
    test('dragging a selection holds the page still until release', async ({ page }) => {
        await seedNote(page, TWELVE_LINES);

        const start = await page.evaluate(() => {
            const textArea = document.querySelector('textarea#editor') as HTMLTextAreaElement;
            const rect = textArea.getBoundingClientRect();
            const lineHeight = parseFloat(getComputedStyle(textArea).lineHeight);

            return { x: rect.left + 5, y: rect.top + 7 * lineHeight + lineHeight / 2, lineHeight };
        });
        const scrollBefore = await page.evaluate(() => window.scrollY);

        // press on line 8 and drag up to line 6
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(start.x + 80, start.y - 2 * start.lineHeight, { steps: 8 });

        expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);

        await page.mouse.up();

        // the range survived and the dragged end glides to center
        const selection = await page.evaluate(() => {
            const textArea = document.querySelector('textarea#editor') as HTMLTextAreaElement;

            return { start: textArea.selectionStart, end: textArea.selectionEnd };
        });

        expect(selection.start).toBeLessThan(selection.end);
        await expect.poll(async () => Math.abs((await caretState(page)).offCenter)).toBeLessThan(1);
    });

    test('shift-selecting follows the active end without collapsing', async ({ page }) => {
        await seedNote(page, TWELVE_LINES);

        await page.keyboard.press('Shift+ArrowUp');

        const selection = await page.evaluate(() => {
            const textArea = document.querySelector('textarea#editor') as HTMLTextAreaElement;

            return { start: textArea.selectionStart, end: textArea.selectionEnd };
        });

        // the range survives (cursorPos tracking must not collapse it) and
        // the highlight sits on the end being dragged, not the anchor
        expect(selection.start).toBeLessThan(selection.end);

        await expect.poll(async () => (await caretState(page)).spanText).toBe('line number 11\n');
        expect(Math.abs((await caretState(page)).offCenter)).toBeLessThan(1);
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
