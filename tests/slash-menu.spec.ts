import { test, expect } from '@playwright/test';
import { seedNote } from './utils';

const NOTE = 'first line';
const menu = '[data-no-refocus]';
const menuLabels = `${menu} [class*=item] [class*=label]`;
const menuDisabled = `${menu} [class*=item][class*=disabled]`;

// moves the caret to a fresh, otherwise-empty line at the end of the note -
// the only place "/" is allowed to trigger. NOTE is a single line, so 'End'
// (end of line) already lands at the end of the whole document.
async function newEmptyLine(page: import('@playwright/test').Page) {
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
}

test.beforeEach(async ({ page }) => {
    await seedNote(page, NOTE);
});

test.describe('slash menu trigger', () => {
    test('opens on "/" as the first character of an empty line', async ({ page }) => {
        await newEmptyLine(page);
        await page.keyboard.type('/');

        await expect(page.locator(menu)).toBeVisible();
    });

    test('does not trigger mid-word (e.g. a fraction)', async ({ page }) => {
        await newEmptyLine(page);
        await page.keyboard.type('1/2 cup flour');

        await expect(page.locator(menu)).toHaveCount(0);
    });

    test('does not trigger inside a URL', async ({ page }) => {
        await newEmptyLine(page);
        await page.keyboard.type('see docs.com/api');

        await expect(page.locator(menu)).toHaveCount(0);
    });

    test('does not trigger inside a date', async ({ page }) => {
        await newEmptyLine(page);
        await page.keyboard.type('7/12/2026');

        await expect(page.locator(menu)).toHaveCount(0);
    });

    test('does not trigger with an active text selection', async ({ page }) => {
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.type('/');

        // "/" lands as ordinary text, replacing the selection - no menu
        await expect(page.locator(menu)).toHaveCount(0);
        await expect(page.locator('textarea#editor')).toHaveValue('/');
    });

    test('does not trigger when there is text later on the same line', async ({ page }) => {
        await page.keyboard.press('Home');
        await page.keyboard.type('/');

        await expect(page.locator(menu)).toHaveCount(0);
    });

    test('escape closes the menu without inserting the slash', async ({ page }) => {
        await newEmptyLine(page);
        await page.keyboard.type('/');
        await page.keyboard.press('Escape');

        await expect(page.locator(menu)).toHaveCount(0);
        await expect(page.locator('textarea#editor')).toHaveValue(`${NOTE}\n`);
    });

    test('moving the caret off the trigger line closes the menu', async ({ page }) => {
        await newEmptyLine(page);
        await page.keyboard.type('/');

        // ArrowUp/Down are captured for menu navigation while it's open (by
        // design - they drive the dropdown, not the text), so use a key the
        // menu doesn't intercept: ArrowLeft at the start of the fresh empty
        // line moves the caret back onto the previous line
        await page.keyboard.press('ArrowLeft');

        await expect(page.locator(menu)).toHaveCount(0);
    });
});

test.describe('slash menu list', () => {
    test('typing after "/" filters the action list', async ({ page }) => {
        await newEmptyLine(page);
        await page.keyboard.type('/cont');

        await expect(page.locator(menuLabels)).toHaveText(['Continue writing']);
    });

    test('lists all three actions with an empty query', async ({ page }) => {
        await newEmptyLine(page);
        await page.keyboard.type('/');

        await expect(page.locator(menuLabels)).toHaveText(['Continue writing', 'Rewrite selection', 'Fix grammar']);
    });
});

test.describe('selection tracking for rewrite/fix-grammar', () => {
    test('rewrite and fix-grammar are disabled until text has been selected', async ({ page }) => {
        await newEmptyLine(page);
        await page.keyboard.type('/');

        await expect(page.locator(menuDisabled)).toHaveCount(2);
    });

    test('clicking a disabled action does not select it', async ({ page }) => {
        await newEmptyLine(page);
        await page.keyboard.type('/');
        await page.click(`${menu} [class*=item]:has-text("Rewrite selection")`);

        // still open, still disabled - nothing happened
        await expect(page.locator(menu)).toBeVisible();
        await expect(page.locator(menuDisabled)).toHaveCount(2);
    });

    test('a prior selection enables both actions and survives moving to an empty line', async ({ page }) => {
        await page.keyboard.press('Home');

        for (let i = 0; i < 5; i++) {
            await page.keyboard.press('Shift+ArrowRight');
        }

        await newEmptyLine(page);
        await page.keyboard.type('/');

        await expect(page.locator(menuDisabled)).toHaveCount(0);
    });
});

test.describe('generation state', () => {
    test('confirming an action locks the editor read-only, and Escape cancels and unlocks it', async ({ page }) => {
        // block the model's network calls so this settles quickly via an
        // error path instead of actually downloading hundreds of MB
        await page.route(/huggingface\.co|cdn-lfs|hf\.co/, (route) => route.abort());

        await newEmptyLine(page);
        await page.keyboard.type('/continue');
        await page.keyboard.press('Enter');

        await expect(page.locator('textarea#editor')).toHaveAttribute('readonly', '');

        await page.keyboard.press('Escape');

        await expect(page.locator('textarea#editor')).not.toHaveAttribute('readonly', '');
        await expect(page.locator(menu)).toHaveCount(0);
    });
});
