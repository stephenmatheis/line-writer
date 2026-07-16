import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { seedNote, openPalette, openQuickOpen, runCommand } from './utils';

const NOTE = 'groceries\nmilk\neggs';

type IndexEntry = { id: string; title: string };

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
        await openQuickOpen(page);
        await runCommand(page, 'new note');

        await expect(page.locator('textarea#editor')).toHaveValue('');
        expect(await notesIndex(page)).toHaveLength(2);
    });

    test('a note title matches directly in quick-open (mod+p)', async ({ page }) => {
        await openQuickOpen(page);
        await runCommand(page, 'new note');
        await page.keyboard.type('second note stuff');

        await openQuickOpen(page);
        await runCommand(page, 'groceries');

        await expect(page.locator('textarea#editor')).toHaveValue(NOTE);

        await openQuickOpen(page);
        await runCommand(page, 'second');

        await expect(page.locator('textarea#editor')).toHaveValue('second note stuff');
    });

    test('titles follow the first non-empty line as you type', async ({ page }) => {
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.type('a better title');

        await openQuickOpen(page);
        await page.keyboard.type('a better title');

        await expect(page.locator('[data-no-refocus] [class*=item] [class*=label]')).toHaveText(['a better title']);
    });

    test('deleting the open note falls back to another one', async ({ page }) => {
        await openQuickOpen(page);
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

    test('export downloads the note as <title>.txt', async ({ page }) => {
        await openPalette(page);
        // not runCommand here - the download listener has to be armed
        // before Enter fires the command, or the event slips past it
        await page.keyboard.type('export');

        const downloadPromise = page.waitForEvent('download');

        await page.keyboard.press('Enter');

        const download = await downloadPromise;

        expect(download.suggestedFilename()).toBe('groceries.txt');
        expect(readFileSync(await download.path(), 'utf-8')).toBe(NOTE);
    });

    test('a dismissed delete confirm leaves everything alone', async ({ page }) => {
        page.on('dialog', (dialog) => void dialog.dismiss());

        await openPalette(page);
        await runCommand(page, 'delete note');
        await runCommand(page, 'groceries');

        await expect(page.locator('textarea#editor')).toHaveValue(NOTE);
        expect(await notesIndex(page)).toHaveLength(1);
    });

    // Issue #8: crypto.randomUUID() only works in secure contexts (https, or
    // localhost) - a first-ever visit over plain http to a LAN IP has no
    // notes yet, so ensureNotes() -> createNote() used to throw before the
    // editor ever mounted.
    test('the first note is created even without crypto.randomUUID', async ({ page }) => {
        // simulate an insecure context (plain http to a LAN IP), where this
        // is absent - applies to every navigation from here on, including
        // the reload below. randomUUID lives on Crypto.prototype, not the
        // crypto instance, so `delete window.crypto.randomUUID` is a no-op;
        // shadowing it with an own property is what actually hides it.
        await page.addInitScript(() => {
            Object.defineProperty(window.crypto, 'randomUUID', { value: undefined, configurable: true });
        });

        // beforeEach already seeded one note - clear it so this reload hits
        // the empty-index -> createNote() path the bug lived in
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        await expect(page.locator('textarea#editor')).toBeVisible();
        expect(await notesIndex(page)).toHaveLength(1);
    });
});
