import crypto from 'node:crypto';

const KEY_LENGTH = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 32 * 1024 * 1024
  }).toString('hex');
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  try {
    const [scheme, n, r, p, salt, hash] = String(encoded || '').split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, Buffer.from(hash, 'hex').length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 32 * 1024 * 1024
    });
    const expected = Buffer.from(hash, 'hex');
    return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}
