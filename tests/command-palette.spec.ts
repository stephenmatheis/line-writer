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

    test('escape backs out of a sub-list before closing', async ({ page }) => {
        await openPalette(page);
        await page.keyboard.type('open note');
        await page.keyboard.press('Enter');

        // in the notes picker now - escape should return to the commands
        await page.keyboard.press('Escape');

        await expect(page.locator(paletteLabels).filter({ hasText: 'New note' })).toHaveCount(1);

        // and only a second escape closes the palette
        await page.keyboard.press('Escape');

        await expect(page.locator(palette)).toHaveCount(0);
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

        await expect(page.locator('textarea#editor')).toHaveValue(NOTE);
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

        await expect(freshPage.locator('textarea#editor')).toHaveValue(NOTE);
        expect(await freshPage.evaluate(() => location.hash)).toBe('');

        await freshContext.close();
    });

    test('imports as a new note, never on top of an existing one', async ({ page, browser, baseURL }) => {
        const url = await copyShareLink(page);
        // manually created contexts don't inherit the config's baseURL
        const otherContext = await browser.newContext({ baseURL });
        const otherPage = await otherContext.newPage();

        await otherPage.goto('/');
        await otherPage.waitForSelector('textarea#editor');
        await otherPage.keyboard.type('my precious existing note');

        // goto with only a hash change is same-document; reload to remount
        await otherPage.goto(url);
        await otherPage.reload();
        await otherPage.waitForSelector('textarea#editor');

        // the shared note is open, and the note that was there survived
        await expect(otherPage.locator('textarea#editor')).toHaveValue(NOTE);

        const titles = await otherPage.evaluate(() =>
            JSON.parse(localStorage.getItem('notes') || '[]').map((note: { title: string }) => note.title),
        );

        expect(titles).toContain('my precious existing note');

        await otherContext.close();
    });
});
