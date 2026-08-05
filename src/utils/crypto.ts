const KEY = 0x57; // Simple static key for client-side obfuscation to prevent plain text scraping

export function encrypt(text: string): string {
  if (!text) return '';
  const bytes = new TextEncoder().encode(text);
  const obfuscated = bytes.map(b => b ^ KEY);
  return btoa(String.fromCharCode(...obfuscated));
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
