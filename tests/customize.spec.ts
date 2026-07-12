import { test, expect } from '@playwright/test';
import { seedNote, caretState, openPalette, runCommand, oneRlh } from './utils';

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
        expect(after.width).not.toBe(before.width);
        expect(after.fontSize).toBe('16px');

        await page.reload();
        await page.waitForSelector('textarea#editor');

        expect((await editorStyle(page)).fontFamily).toContain('PureProg');
    });

    test('switching the font size applies live and persists across reload', async ({ page }) => {
        // Large for DepartureMono is 22px (multiples of 11)
        await openPalette(page);
        await runCommand(page, 'font si');
        await runCommand(page, 'large');

        expect((await editorStyle(page)).fontSize).toBe('22px');

        await page.reload();
        await page.waitForSelector('textarea#editor');

        expect((await editorStyle(page)).fontSize).toBe('22px');
    });

    test('switching the line height moves the line grid and the body padding together', async ({ page }) => {
        // the multiplier base is the font's natural line height, which for
        // DepartureMono at medium (16.5px) resolves to 22px - not 16.5
        const natural = await oneRlh(page);

        expect(natural).toBeCloseTo(22, 1);

        await openPalette(page);
        await runCommand(page, 'line height');
        await runCommand(page, '3');

        const metrics = await page.evaluate(() => {
            const textArea = document.querySelector('textarea#editor') as HTMLTextAreaElement;

            return {
                lineHeight: getComputedStyle(textArea).lineHeight,
                paddingTop: parseFloat(getComputedStyle(document.body).paddingTop),
            };
        });

        expect(parseFloat(metrics.lineHeight)).toBeCloseTo(natural * 3, 1);

        // the load-bearing invariant: padding is half the viewport minus half
        // a line, so the first and last lines can still reach dead center
        const viewportHeight = page.viewportSize()!.height;

        expect(metrics.paddingTop).toBeCloseTo(viewportHeight / 2 - (natural * 3) / 2, 1);

        // and the caret line is still centered under the new grid
        const state = await caretState(page);

        expect(state.spanText).toBe('third line');
        expect(Math.abs(state.offCenter)).toBeLessThan(1);

        await page.reload();
        await page.waitForSelector('textarea#editor');

        expect(
            parseFloat(
                await page.evaluate(() => getComputedStyle(document.querySelector('textarea#editor')!).lineHeight),
            ),
        ).toBeCloseTo(natural * 3, 1);
    });

    test("multiplier 1 is the font's em-box height, and the textarea sits flush on it", async ({ page }) => {
        // Stephen's example: DepartureMono at 22px has a 28px-tall em square
        await openPalette(page);
        await runCommand(page, 'font si');
        await runCommand(page, 'large');

        expect(await oneRlh(page)).toBeCloseTo(28, 1);

        await openPalette(page);
        await runCommand(page, 'line height');
        await runCommand(page, '1');

        // regression: with font-size-based multipliers, a fractional line
        // height made scrollHeight round up past the line grid and the
        // textarea drifted taller than its lines
        const box = await page.evaluate(() => {
            const textArea = document.querySelector('textarea#editor') as HTMLTextAreaElement;

            return {
                lineHeight: parseFloat(getComputedStyle(textArea).lineHeight),
                clientHeight: textArea.clientHeight,
                lines: textArea.value.split('\n').length,
            };
        });

        expect(box.lineHeight).toBeCloseTo(28, 1);
        expect(box.clientHeight).toBeCloseTo(box.lines * box.lineHeight, 1);
    });

    test('a legacy line-height value falls back to the default', async ({ page }) => {
        // older builds stored names like 'relaxed'
        await page.evaluate(() => localStorage.setItem('line-height', 'relaxed'));
        await page.reload();
        await page.waitForSelector('textarea#editor');

        // default multiplier 2 x the natural line height
        const natural = await oneRlh(page);

        expect(
            parseFloat(
                await page.evaluate(() => getComputedStyle(document.querySelector('textarea#editor')!).lineHeight),
            ),
        ).toBeCloseTo(natural * 2, 1);
    });

    test('the palette row height tracks the line height selection', async ({ page }) => {
        await openPalette(page);

        const before = await page.evaluate(
            () => document.querySelector('[data-no-refocus] [class*=item]')!.getBoundingClientRect().height,
        );

        await runCommand(page, 'line height');
        await runCommand(page, '3');

        // the palette was closed by that command; reopen to measure the new rows
        await openPalette(page);

        const after = await page.evaluate(
            () => document.querySelector('[data-no-refocus] [class*=item]')!.getBoundingClientRect().height,
        );
        const natural = await oneRlh(page);

        expect(before).toBeCloseTo(natural * 2, 1); // default multiplier
        expect(after).toBeCloseTo(natural * 3, 1);
        expect(after).not.toBeCloseTo(before, 1);
    });

    test('the width picker resizes the editor and persists across reload', async ({ page }) => {
        const before = (await editorStyle(page)).width;

        await openPalette(page);
        await runCommand(page, 'width...');
        await runCommand(page, 'wide');

        const after = (await editorStyle(page)).width;

        // wide is 90ch vs the default 60ch - exactly 1.5x
        expect(after).toBeCloseTo(before * 1.5, 1);

        await page.reload();
        await page.waitForSelector('textarea#editor');

        expect((await editorStyle(page)).width).toBeCloseTo(after, 1);
    });

    test('changing the width recenters the caret line', async ({ page }) => {
        await openPalette(page);
        await runCommand(page, 'width...');
        await runCommand(page, 'narrow');

        const state = await caretState(page);

        expect(state.spanText).toBe('third line');
        expect(Math.abs(state.offCenter)).toBeLessThan(1);
    });

    test('debug guides are off by default and toggle the red bar + tint', async ({ page }) => {
        const guideStyle = () =>
            page.evaluate(() => ({
                editorBackground: getComputedStyle(document.querySelector('[class*=editor]')!).backgroundColor,
                barDisplay: getComputedStyle(document.querySelector('[class*=bar]')!).display,
            }));

        const before = await guideStyle();

        expect(before.editorBackground).toBe('rgba(0, 0, 0, 0)');
        expect(before.barDisplay).toBe('none');

        await openPalette(page);
        await runCommand(page, 'debug guides');
        await runCommand(page, 'on');

        const on = await guideStyle();

        expect(on.editorBackground).not.toBe('rgba(0, 0, 0, 0)');
        expect(on.barDisplay).toBe('block');

        await page.reload();
        await page.waitForSelector('textarea#editor');

        expect((await guideStyle()).barDisplay).toBe('block');

        await openPalette(page);
        await runCommand(page, 'debug guides');
        await runCommand(page, 'off');

        const off = await guideStyle();

        expect(off.editorBackground).toBe('rgba(0, 0, 0, 0)');
        expect(off.barDisplay).toBe('none');
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
