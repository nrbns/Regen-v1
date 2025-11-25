/**
 * Lightweight nanoid-style generator (no dependency).
 */
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';

export function nanoid(length: number = 16): string {
  let id = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * alphabet.length);
    id += alphabet[idx];
  }
  return id;
}
