import { test, expect } from '@playwright/test';
import { seedNote, openPalette, runCommand } from './utils';

// Issue #4: clipboard failures and corrupt share links used to fail with no
// feedback at all. Everything user-visible now goes through the status line.

const NOTE = 'status line test note';

test.describe('status line', () => {
    test('copy note confirms on the status line', async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'needs Chromium clipboard permissions');

        await seedNote(page, NOTE);
        await openPalette(page);
        await runCommand(page, 'copy note');

        await expect(page.getByRole('status')).toHaveText('Copied note');
    });

    test('a blocked clipboard shows an error instead of failing silently', async ({ page }) => {
        // simulate the plain-http / permission-denied case before the app loads
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'clipboard', {
                value: { writeText: () => Promise.reject(new Error('blocked')) },
            });
        });

        await seedNote(page, NOTE);
        await openPalette(page);
        await runCommand(page, 'copy note');

        await expect(page.getByRole('alert')).toContainText("Couldn't copy");
    });

    test('a corrupt share link shows an error and falls back to the active note', async ({ page }) => {
        await seedNote(page, NOTE);

        // '!' is not valid base64url, so decodeNote throws before it can
        // even guess at the payload kind. goto with only a hash change
        // doesn't reload the page, so reload to actually run the import
        await page.goto('/#n:d!!!broken!!!');
        await page.reload();
        await page.waitForSelector('textarea#editor');

        await expect(page.getByRole('alert')).toContainText("Couldn't open the share link");

        // still lands on the previously active note, hash stripped
        await expect(page.locator('textarea#editor')).toHaveValue(NOTE);
        expect(new URL(page.url()).hash).toBe('');
    });
});
