import { test, expect } from '@playwright/test';
import { seedNote } from './utils';

const NOTE = 'hello world note';
const palette = '[data-no-refocus]';
const paletteInput = `${palette} input`;
const paletteLabels = `${palette} [class*=item] [class*=label]`;

async function openPalette(page: import('@playwright/test').Page) {
    await page.keyboard.press('ControlOrMeta+Shift+KeyP');
    await page.waitForSelector(paletteInput);
}

test.beforeEach(async ({ page }) => {
    await seedNote(page, NOTE);
});

test.describe('command palette', () => {
    test('opens with mod+shift+p and focuses the input', async ({ page }) => {
        await openPalette(page);

        await expect(page.locator(paletteInput)).toBeFocused();
    });

    test('escape closes and refocuses the editor', async ({ page }) => {
        await openPalette(page);
        await page.keyboard.press('Escape');

        await expect(page.locator(palette)).toHaveCount(0);
        await expect(page.locator('textarea#editor')).toBeFocused();
    });

    test('clicking inside the palette does not let the editor steal focus', async ({ page }) => {
        await openPalette(page);
        await page.click(paletteInput);

        await expect(page.locator(paletteInput)).toBeFocused();
    });

    test('filters to a theme command and runs it', async ({ page }) => {
        await openPalette(page);
        await page.keyboard.type('dar');

        await expect(page.locator(paletteLabels)).toHaveText(['Theme: Dark']);

        await page.keyboard.press('Enter');

        await expect(page.locator(palette)).toHaveCount(0);
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
        await expect(page.locator('textarea#editor')).toBeFocused();
    });

    test('typing in the palette does not modify the note', async ({ page }) => {
        await openPalette(page);
        await page.keyboard.type('anything at all');

        expect(await page.evaluate(() => localStorage.getItem('note'))).toBe(NOTE);
    });

    test('arrow keys wrap through the list', async ({ page }) => {
        await openPalette(page);
        await page.keyboard.press('ArrowUp');

        const isLastSelected = await page.evaluate(() => {
            const items = [...document.querySelectorAll('[data-no-refocus] [class*=item]')];

            return items.findIndex((item) => item.hasAttribute('data-selected')) === items.length - 1;
        });

        expect(isLastSelected).toBe(true);
    });

    test('matches subsequences, not just substrings', async ({ page }) => {
        await openPalette(page);
        await page.keyboard.type('thl');

        await expect(page.locator(paletteLabels).filter({ hasText: 'Theme: Light' })).toHaveCount(1);
    });

    test('resets the query when reopened (regression, ISSUES.md #1)', async ({ page }) => {
        await openPalette(page);
        await page.keyboard.type('thl');
        await page.keyboard.press('Escape');
        await openPalette(page);

        await expect(page.locator(paletteInput)).toHaveValue('');

        // the original failure mode: text typed right after reopening was
        // appended to the stale query and matched nothing
        await page.keyboard.type('share');

        await expect(page.locator(paletteLabels)).toHaveText(['Copy share link']);
    });
});

test.describe('share links', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'needs Chromium clipboard permissions');

    async function copyShareLink(page: import('@playwright/test').Page) {
        await openPalette(page);
        await page.keyboard.type('share');
        await page.keyboard.press('Enter');

        await expect
            .poll(() => page.evaluate(() => navigator.clipboard.readText()), { timeout: 5000 })
            .toContain('#n:');

        return page.evaluate(() => navigator.clipboard.readText());
    }

    test('round-trips into an empty profile', async ({ page, browser }) => {
        const url = await copyShareLink(page);
        const freshContext = await browser.newContext();
        const freshPage = await freshContext.newPage();

        await freshPage.goto(url);
        await freshPage.waitForSelector('textarea#editor');

        expect(await freshPage.evaluate(() => localStorage.getItem('note'))).toBe(NOTE);
        expect(await freshPage.evaluate(() => location.hash)).toBe('');

        await freshContext.close();
    });

    test('asks before replacing a differing note', async ({ page, browser, baseURL }) => {
        const url = await copyShareLink(page);
        // manually created contexts don't inherit the config's baseURL
        const otherContext = await browser.newContext({ baseURL });
        const otherPage = await otherContext.newPage();

        await otherPage.goto('/');
        await otherPage.evaluate(() => localStorage.setItem('note', 'my precious existing note'));

        let sawConfirm = false;

        otherPage.on('dialog', (dialog) => {
            sawConfirm = true;

            void dialog.dismiss();
        });

        // goto with only a hash change is same-document; reload to remount
        await otherPage.goto(url);
        await otherPage.reload();
        await otherPage.waitForSelector('textarea#editor');

        expect(sawConfirm).toBe(true);
        expect(await otherPage.evaluate(() => localStorage.getItem('note'))).toBe('my precious existing note');

        await otherContext.close();
    });
});
