import { test, expect } from '@playwright/test';
import { seedNote, caretState, openPalette, runCommand } from './utils';

const NOTE = 'first line\nsecond line\nthird line';
const paletteLabels = '[data-no-refocus] [class*=item] [class*=label]';

function editorStyle(page: import('@playwright/test').Page) {
    return page.evaluate(() => {
        const cs = getComputedStyle(document.querySelector('textarea#editor')!);

        return { fontFamily: cs.fontFamily, fontSize: cs.fontSize, width: parseFloat(cs.width) };
    });
}

test.beforeEach(async ({ page }) => {
    await seedNote(page, NOTE);
});

test.describe('customize', () => {
    test('the font picker lists the candidates with the current one marked', async ({ page }) => {
        await openPalette(page);
        await runCommand(page, 'font...');

        await expect(page.locator(paletteLabels)).toHaveText([
            'Departure Mono',
            'PureProg',
            'Paper Mono',
            'System monospace',
        ]);
    });

    test('switching the font applies live and persists across reload', async ({ page }) => {
        const before = await editorStyle(page);

        await openPalette(page);
        await runCommand(page, 'font...');
        await runCommand(page, 'pureprog');

        const after = await editorStyle(page);

        expect(after.fontFamily).toContain('PureProg');
        // same 20ch width, different metrics - the box actually resized
        expect(after.width).not.toBe(before.width);

        await page.reload();
        await page.waitForSelector('textarea#editor');

        expect((await editorStyle(page)).fontFamily).toContain('PureProg');
    });

    test('switching the font size applies live and persists across reload', async ({ page }) => {
        await openPalette(page);
        await runCommand(page, 'font si');
        await runCommand(page, 'large');

        expect((await editorStyle(page)).fontSize).toBe('26px');

        await page.reload();
        await page.waitForSelector('textarea#editor');

        expect((await editorStyle(page)).fontSize).toBe('26px');
    });

    test('the caret line stays centered and highlighted through a font change', async ({ page }) => {
        await openPalette(page);
        await runCommand(page, 'font...');
        await runCommand(page, 'paper mono');

        const state = await caretState(page);

        expect(state.spanText).toBe('third line');
        expect(Math.abs(state.offCenter)).toBeLessThan(1);
    });
});
