import { test, expect } from '@playwright/test';
import { seedNote } from './utils';

const NOTE = 'hello world note';
const palette = '[data-no-refocus]';
const paletteInput = `${palette} input`;
const paletteLabels = `${palette} [class*=item] [class*=label]`;

// mod+shift+p - commands: manage, customize, share (no notes in this list)
async function openPalette(page: import('@playwright/test').Page) {
    await page.keyboard.press('ControlOrMeta+Shift+KeyP');
    await page.waitForSelector(paletteInput);
}

// mod+p - quick-open: jump straight to a note, or start a new one
async function openQuickOpen(page: import('@playwright/test').Page) {
    await page.keyboard.press('ControlOrMeta+KeyP');
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
        await page.keyboard.type('delete note');
        await page.keyboard.press('Enter');

        // in the delete-note picker now - escape should return to the commands
        await page.keyboard.press('Escape');

        await expect(page.locator(paletteLabels).filter({ hasText: 'Delete note...' })).toHaveCount(1);

        // and only a second escape closes the palette
        await page.keyboard.press('Escape');

        await expect(page.locator(palette)).toHaveCount(0);
    });

    test('clicking inside the palette does not let the editor steal focus', async ({ page }) => {
        await openPalette(page);
        await page.click(paletteInput);

        await expect(page.locator(paletteInput)).toBeFocused();
    });

    test('escape backs out of a mouse-opened sub-list too (regression)', async ({ page }) => {
        // the bug: drilling in with the mouse (unlike Enter) fires a real
        // click event, which raced React's re-render and left focus
        // stranded outside the palette's input - so neither typing nor
        // escape reached the sub-list afterward
        await openPalette(page);
        await page.click(`${palette} [class*=item]:has-text("Delete note")`);

        await expect(page.locator(paletteInput)).toBeFocused();

        // typing should filter the sub-list, not land in the note
        await page.keyboard.type('zzz-no-match');

        await expect(page.locator(`${palette} [class*=empty]`)).toBeVisible();
        await expect(page.locator('textarea#editor')).toHaveValue(NOTE);

        // one escape pops out of the note picker straight to the top level
        await page.keyboard.press('Escape');

        await expect(page.locator(paletteLabels).filter({ hasText: 'Delete note...' })).toHaveCount(1);
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

test.describe('quick open', () => {
    test('opens with mod+p and focuses the input', async ({ page }) => {
        await openQuickOpen(page);

        await expect(page.locator(paletteInput)).toBeFocused();
    });

    test('lists notes directly, no commands mixed in', async ({ page }) => {
        await openQuickOpen(page);

        await expect(page.locator(paletteLabels)).toHaveText(['New note', NOTE]);
    });

    test('mod+shift+p (commands) does not include notes', async ({ page }) => {
        await openPalette(page);
        await page.keyboard.type('hello world');

        await expect(page.locator(`${palette} [class*=empty]`)).toBeVisible();
    });

    test('either shortcut closes the palette while it is open', async ({ page }) => {
        await openQuickOpen(page);
        await page.keyboard.press('ControlOrMeta+Shift+KeyP');

        await expect(page.locator(palette)).toHaveCount(0);
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

test.describe('clipboard', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'needs Chromium clipboard permissions');

    test('copy note puts the exact note text on the clipboard', async ({ page }) => {
        await openPalette(page);
        await page.keyboard.type('copy note');
        await page.keyboard.press('Enter');

        await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()), { timeout: 5000 }).toBe(NOTE);
    });
});

test.describe('share link import', () => {
    // the 'r' (raw, uncompressed) payload is what encodeNote falls back to
    // on browsers without CompressionStream. Neither test browser is that
    // old, so build the payload by hand to keep the decode branch covered
    test('a raw payload imports as a new note', async ({ page }) => {
        const text = 'raw payload note';
        const payload = 'r' + Buffer.from(text, 'utf-8').toString('base64url');

        // goto with only a hash change is same-document; reload to remount
        await page.goto(`/#n:${payload}`);
        await page.reload();
        await page.waitForSelector('textarea#editor');

        await expect(page.locator('textarea#editor')).toHaveValue(text);
        expect(await page.evaluate(() => location.hash)).toBe('');
    });

    test('a corrupt payload still boots on the previous note', async ({ page }) => {
        // two ways a link goes bad: an unknown kind byte, and base64 that
        // won't even parse (a truncated or mangled URL)
        for (const payload of ['zAAAA', 'd!!!']) {
            await page.goto(`/#n:${payload}`);
            await page.reload();
            await page.waitForSelector('textarea#editor');

            await expect(page.locator('textarea#editor')).toHaveValue(NOTE);
            expect(await page.evaluate(() => location.hash)).toBe('');
        }

        // and no phantom note got added along the way
        const titles = await page.evaluate(() =>
            JSON.parse(localStorage.getItem('notes') || '[]').map((note: { title: string }) => note.title),
        );

        expect(titles).toEqual([NOTE]);
    });
});
