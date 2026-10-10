const KEY = 0x57; // Simple static key for client-side obfuscation to prevent plain text scraping

export function encrypt(text: string): string {
  if (!text) return '';
  const bytes = new TextEncoder().encode(text);
  const len = bytes.length;
  const CHUNK_SIZE = 8192;
  let binary = '';

  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const end = Math.min(i + CHUNK_SIZE, len);
    const chunk: number[] = [];
    for (let j = i; j < end; j++) {
      chunk.push(bytes[j] ^ KEY);
    }
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function decrypt(encoded: string): string {
  if (!encoded) return '';
  try {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i) ^ KEY;
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    // If decryption fails, it might be unencrypted plaintext from previous versions.
    // Return original string as fallback.
    return encoded;
  }
}
