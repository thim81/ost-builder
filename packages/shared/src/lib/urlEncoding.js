/**
 * URL-safe base64 encoding utilities.
 *
 * Works in both browser and Cloudflare Workers environments.
 * Uses base64url encoding (RFC 4648) for URL fragments.
 */
/**
 * Encodes a string into a URL-safe base64 fragment.
 * Uses base64url encoding (+ → -, / → _, no padding).
 */
export function encodeStringToUrlFragment(value) {
    // Convert UTF-8 bytes -> base64
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    // base64url (RFC 4648)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
/**
 * Decodes a URL-safe base64 fragment back to a string.
 * Returns null if decoding fails.
 */
export function decodeStringFromUrlFragment(fragment) {
    try {
        // base64url -> base64
        let base64 = fragment.replace(/-/g, '+').replace(/_/g, '/');
        // Pad to multiple of 4
        const pad = base64.length % 4;
        if (pad)
            base64 += '='.repeat(4 - pad);
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
    }
    catch {
        return null;
    }
}
