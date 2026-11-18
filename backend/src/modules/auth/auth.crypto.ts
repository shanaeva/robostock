import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { REFRESH_TOKEN_MAX_LENGTH } from './auth.constants.js';

// OWASP scrypt baseline: N=2^17, r=8, p=1. Each call uses ~128 MiB of memory.
const SCRYPT_OPTIONS = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt);
  return `scrypt$${SCRYPT_OPTIONS.N}$8$1$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const parts = encoded.split('$');
  const salt = parts[4];
  const expected = parts[5];
  if (
    parts.length !== 6 ||
    parts[0] !== 'scrypt' ||
    parts[1] !== String(SCRYPT_OPTIONS.N) ||
    parts[2] !== '8' ||
    parts[3] !== '1' ||
    !salt ||
    !expected ||
    !/^[a-f0-9]{128}$/.test(expected)
  )
    return false;
  const key = await derive(password, salt);
  return timingSafeEqual(key, Buffer.from(expected, 'hex'));
}

export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

export function tokenDigest(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function codeDigest(
  secret: string,
  email: string,
  purpose: string,
  code: string,
): string {
  return createHmac('sha256', secret)
    .update(`${email}\n${purpose}\n${code}`)
    .digest('hex');
}

export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createCsrf(secret: string): string {
  const nonce = randomToken();
  const signature = createHmac('sha256', secret)
    .update(`csrf:${nonce}`)
    .digest('base64url');
  return `${nonce}.${signature}`;
}

export function verifyCsrf(secret: string, token: string): boolean {
  if (token.length > REFRESH_TOKEN_MAX_LENGTH) return false;
  const [nonce, signature, extra] = token.split('.');
  if (!nonce || !signature || extra !== undefined) return false;
  const expected = createHmac('sha256', secret)
    .update(`csrf:${nonce}`)
    .digest('base64url');
  return safeEqual(signature, expected);
}
