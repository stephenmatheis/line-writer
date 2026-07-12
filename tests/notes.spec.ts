import { test, expect } from '@playwright/test';
import { seedNote } from './utils';

const NOTE = 'groceries\nmilk\neggs';
const paletteInput = '[data-no-refocus] input';

type IndexEntry = { id: string; title: string };

async function openPalette(page: import('@playwright/test').Page) {
    await page.keyboard.press('ControlOrMeta+Shift+KeyP');
    await page.waitForSelector(paletteInput);
}

// filter to a single command and run it; works for sub-lists too since the
// palette stays open after drilling in
async function runCommand(page: import('@playwright/test').Page, query: string) {
    await page.keyboard.type(query);
    await page.keyboard.press('Enter');
}

function notesIndex(page: import('@playwright/test').Page): Promise<IndexEntry[]> {
    return page.evaluate(() => JSON.parse(localStorage.getItem('notes') || '[]'));
}

test.beforeEach(async ({ page }) => {
    await seedNote(page, NOTE);
});

test.describe('notes', () => {
    test('the legacy single note folds into the notes index', async ({ page }) => {
        const index = await notesIndex(page);

        expect(index).toHaveLength(1);
        expect(index[0].title).toBe('groceries');

        await expect(page.locator('textarea#editor')).toHaveValue(NOTE);

        // the old key survives as a backup
        expect(await page.evaluate(() => localStorage.getItem('note'))).toBe(NOTE);
    });

    test('new note opens empty and keeps the old one around', async ({ page }) => {
        await openPalette(page);
        await runCommand(page, 'new note');

        await expect(page.locator('textarea#editor')).toHaveValue('');
        expect(await notesIndex(page)).toHaveLength(2);
    });

    test('open note switches between notes', async ({ page }) => {
        await openPalette(page);
        await runCommand(page, 'new note');
        await page.keyboard.type('second note stuff');

        await openPalette(page);
        await runCommand(page, 'open note');
        await runCommand(page, 'groceries');

        await expect(page.locator('textarea#editor')).toHaveValue(NOTE);

        await openPalette(page);
        await runCommand(page, 'open note');
        await runCommand(page, 'second');

        await expect(page.locator('textarea#editor')).toHaveValue('second note stuff');
    });

    test('titles follow the first non-empty line as you type', async ({ page }) => {
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.type('a better title');

        await openPalette(page);
        await runCommand(page, 'open note');

        await expect(page.locator('[data-no-refocus] [class*=item] [class*=label]')).toHaveText(['a better title']);
    });

    test('deleting the open note falls back to another one', async ({ page }) => {
        await openPalette(page);
        await runCommand(page, 'new note');
        await page.keyboard.type('second note stuff');

        page.on('dialog', (dialog) => void dialog.accept());

        await openPalette(page);
        await runCommand(page, 'delete note');
        await runCommand(page, 'second');

        await expect(page.locator('textarea#editor')).toHaveValue(NOTE);
        expect(await notesIndex(page)).toHaveLength(1);
    });

    test('deleting the last note starts a fresh empty one', async ({ page }) => {
        page.on('dialog', (dialog) => void dialog.accept());

        const [before] = await notesIndex(page);

        await openPalette(page);
        await runCommand(page, 'delete note');
        await runCommand(page, 'groceries');

        await expect(page.locator('textarea#editor')).toHaveValue('');

        const index = await notesIndex(page);

        expect(index).toHaveLength(1);
        expect(index[0].id).not.toBe(before.id);
    });

    test('a dismissed delete confirm leaves everything alone', async ({ page }) => {
        page.on('dialog', (dialog) => void dialog.dismiss());

        await openPalette(page);
        await runCommand(page, 'delete note');
        await runCommand(page, 'groceries');

        await expect(page.locator('textarea#editor')).toHaveValue(NOTE);
        expect(await notesIndex(page)).toHaveLength(1);
    });
});
