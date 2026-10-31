// "09 00 40 00 E3 F0 00 03 10"
export const toHex = (bytes: ArrayLike<number>): string =>
  Array.from(bytes, (byte) =>
    byte.toString(16).toUpperCase().padStart(2, '0'),
  ).join(' ');

// Inverse of toHex; whitespace is optional. Used by tests.
export const fromHex = (hex: string): Uint8Array => {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length % 2 !== 0 || /[^0-9a-fA-F]/.test(clean)) {
    throw new Error(`Invalid hex string: ${hex}`);
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};
