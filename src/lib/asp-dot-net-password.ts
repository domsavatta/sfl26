/**
 * Passwords in webpages_Membership.Password, in the ASP.NET (SimpleMembership
 * / Crypto.HashPassword) format: base64 of
 *   0x00 | 16-byte salt | 32-byte PBKDF2-HMAC-SHA1 subkey (1000 iterations)
 * so the old site and this one can both check them.
 */
import crypto from 'crypto';

const SALT_BYTES = 16;
const SUBKEY_BYTES = 32;
const ITERATIONS = 1000;

const derive = (password: string, salt: Buffer) =>
  crypto.pbkdf2Sync(Buffer.from(password), salt, ITERATIONS, SUBKEY_BYTES, 'sha1');

/** A new hash for `password`, with a random salt. */
export function hash(password: string) {
  const salt = crypto.randomBytes(SALT_BYTES);
  return Buffer.concat([Buffer.from([0]), salt, derive(password, salt)]).toString(
    'base64',
  );
}

/** Whether `password` matches a stored hash. Malformed hashes never match. */
export function validate(password: string, hashedPwd: string) {
  if (!hashedPwd) return false;
  const bytes = Buffer.from(hashedPwd, 'base64');
  if (bytes.length !== 1 + SALT_BYTES + SUBKEY_BYTES || bytes[0] !== 0) {
    return false;
  }
  const salt = bytes.subarray(1, 1 + SALT_BYTES);
  const stored = bytes.subarray(1 + SALT_BYTES);
  return crypto.timingSafeEqual(derive(password, salt), stored);
}
