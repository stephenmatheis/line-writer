// All note storage lives here. The layout in localStorage:
//
//   'notes'       - the index: [{ id, title, updatedAt }]
//   'note:<id>'   - the actual text of one note
//   'active-note' - id of the note the editor has open
//
// The old single-note key ('note') gets folded into the index the first
// time this runs, and the key itself is left behind as a backup.

export type NoteMeta = {
    id: string;
    title: string;
    updatedAt: number;
};

const INDEX_KEY = 'notes';
const ACTIVE_KEY = 'active-note';

// crypto.randomUUID() only works in secure contexts (https, or localhost) -
// plain http to a LAN IP (testing on a phone over the network) doesn't
// qualify, so it's undefined there. crypto.getRandomValues() has no such
// restriction, so build the same UUID v4 shape from that instead.
function randomId() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// a note's name is just whatever its first non-empty line says
export function titleOf(content: string) {
    const line = content.split('\n').find((candidate) => candidate.trim());

    return line ? line.trim().slice(0, 60) : 'Untitled';
}

// newest first, so pickers and fallbacks always favor recent work
export function listNotes(): NoteMeta[] {
    try {
        const index = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');

        return Array.isArray(index) ? index.sort((a, b) => b.updatedAt - a.updatedAt) : [];
    } catch {
        return [];
    }
}

function saveIndex(index: NoteMeta[]) {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function noteContent(id: string) {
    return localStorage.getItem(`note:${id}`) || '';
}

export function getActiveNote() {
    return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveNote(id: string) {
    localStorage.setItem(ACTIVE_KEY, id);
}

export function saveNote(id: string, content: string) {
    localStorage.setItem(`note:${id}`, content);

    const index = listNotes();
    const meta = index.find((note) => note.id === id);

    if (meta) {
        meta.title = titleOf(content);
        meta.updatedAt = Date.now();

        saveIndex(index);
    }
}

export function createNote(content = ''): string {
    const id = randomId();
    const index = listNotes();

    index.push({ id, title: titleOf(content), updatedAt: Date.now() });

    localStorage.setItem(`note:${id}`, content);
    saveIndex(index);
    setActiveNote(id);

    return id;
}

// returns the id that should be active afterwards
export function deleteNote(id: string): string {
    localStorage.removeItem(`note:${id}`);

    const index = listNotes().filter((note) => note.id !== id);

    saveIndex(index);

    const active = getActiveNote();

    if (active && active !== id) {
        return active;
    }

    // the open note is gone - fall back to the most recently touched one,
    // or start over with a fresh empty note if that was the last of them
    if (index[0]) {
        setActiveNote(index[0].id);

        return index[0].id;
    }

    return createNote();
}

// Make sure there's always at least one note and a valid active id, and
// migrate the old single-note storage on the way. Safe to call twice
// (StrictMode runs state initializers two times).
export function ensureNotes(): string {
    const index = listNotes();

    if (!index.length) {
        return createNote(localStorage.getItem('note') || '');
    }

    const active = getActiveNote();

    if (active && index.some((note) => note.id === active)) {
        return active;
    }

    setActiveNote(index[0].id);

    return index[0].id;
}
