import { Page } from '@playwright/test';

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
