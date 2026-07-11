// Share links pack the whole note into the URL hash: deflate-compressed when
// the browser has CompressionStream, plain utf-8 otherwise. The first payload
// character says which ('d' or 'r') so links decode anywhere.

function bytesToBase64Url(bytes: Uint8Array) {
    let binary = '';

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlToBytes(encoded: string) {
    const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'));
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

async function pipeThrough(bytes: Uint8Array, transform: CompressionStream | DecompressionStream) {
    // copy into a fresh array so TS knows the buffer is a plain ArrayBuffer
    const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(transform);

    return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encodeNote(text: string) {
    const bytes = new TextEncoder().encode(text);

    if (typeof CompressionStream === 'undefined') {
        return 'r' + bytesToBase64Url(bytes);
    }

    return 'd' + bytesToBase64Url(await pipeThrough(bytes, new CompressionStream('deflate-raw')));
}

export async function decodeNote(payload: string) {
    const kind = payload[0];
    const bytes = base64UrlToBytes(payload.slice(1));

    if (kind === 'r') {
        return new TextDecoder().decode(bytes);
    }

    if (kind !== 'd') {
        throw new Error(`unknown share payload kind: ${kind}`);
    }

    return new TextDecoder().decode(await pipeThrough(bytes, new DecompressionStream('deflate-raw')));
}
