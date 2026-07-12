import { Page } from '@playwright/test';

// mod+shift+p - commands: manage, customize, share (no notes in this list)
export async function openPalette(page: Page) {
    await page.keyboard.press('ControlOrMeta+Shift+KeyP');
    await page.waitForSelector('[data-no-refocus] input');
}

// mod+p - quick-open: jump straight to a note, or start a new one
export async function openQuickOpen(page: Page) {
    await page.keyboard.press('ControlOrMeta+KeyP');
    await page.waitForSelector('[data-no-refocus] input');
}

// filter to a single command and run it; works inside sub-lists too since
// the palette stays open after drilling in
export async function runCommand(page: Page, query: string) {
    await page.keyboard.type(query);
    await page.keyboard.press('Enter');
}

// Seed the note (and a known theme) into localStorage, then reload so the
// editor mounts from that state with the caret at the end. Seeding through
// the legacy single-note key means every test also exercises the migration
// into the notes index. The clear() matters: the first goto already ran the
// migration, and a stale index would shadow the seeded key.
export async function seedNote(page: Page, note: string) {
    await page.goto('/');
    await page.evaluate((value) => {
        localStorage.clear();
        localStorage.setItem('note', value);
        localStorage.setItem('theme', 'system');
    }, note);
    await page.reload();
    await page.waitForSelector('textarea#editor');
    await page.evaluate(() => document.fonts.ready);
}

// What 1rlh resolves to right now: the font's natural line height at the
// current root font and size - the base the line-height multipliers scale.
export function oneRlh(page: Page) {
    return page.evaluate(() => {
        const probe = document.createElement('div');

        probe.style.cssText = 'position:absolute;visibility:hidden;height:1rlh';
        document.body.appendChild(probe);

        const height = probe.getBoundingClientRect().height;

        probe.remove();

        return height;
    });
}

// Independent re-measurement of the caret's visual line (same mirror
// technique as the app, reimplemented here so a bug in the app's version
// can't hide itself), plus the current focus-highlight state.
export function caretState(page: Page) {
    return page.evaluate(() => {
        const textArea = document.querySelector('textarea#editor') as HTMLTextAreaElement;
        const overlay = document.querySelector('[class*=overlay]') as HTMLElement;
        const span = overlay.querySelector('span');
        const cs = getComputedStyle(textArea);
        const lineHeight = parseFloat(cs.lineHeight);
        const mirror = document.createElement('div');

        mirror.style.cssText =
            `position:absolute;visibility:hidden;white-space:pre-wrap;overflow-wrap:break-word;` +
            `box-sizing:border-box;width:${textArea.clientWidth}px;` +
            `font-family:${cs.fontFamily};font-size:${cs.fontSize};line-height:${cs.lineHeight}`;
        mirror.textContent = textArea.value.slice(0, textArea.selectionStart);

        const marker = document.createElement('span');

        marker.textContent = '​';
        mirror.appendChild(marker);
        document.body.appendChild(mirror);

        const line = Math.round(marker.offsetTop / lineHeight);

        mirror.remove();

        return {
            line,
            offCenter:
                textArea.getBoundingClientRect().top + line * lineHeight + lineHeight / 2 - window.innerHeight / 2,
            spanText: span ? span.textContent : null,
            spanColor: span ? getComputedStyle(span).color : null,
            overlayColor: getComputedStyle(overlay).color,
        };
    });
}
