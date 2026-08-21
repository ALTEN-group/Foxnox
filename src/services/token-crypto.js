// @ts-check
import { hash, rndB64Secret, tse } from "@dwtechs/hashitaka";

/**
 * @returns {string}
 */
export function tokenSecret() {
  const secret = process.env.PWD_SECRET || process.env.FOXNOX_PWD_SECRET;
  if (!secret) {
    throw new Error("PWD_SECRET is required to hash workflow tokens");
  }
  return secret;
}

/**
 * Opaque plaintext for deep-link query params (URL-safe base64).
 * @param {number} [byteLen=32]
 * @returns {string}
 */
export function randomTokenPlaintext(byteLen = 32) {
  return rndB64Secret(byteLen, true);
}

/**
 * Deterministic HMAC so tokens can be looked up by hash (unlike salted pwd hashes).
 * Uses Hashitaka `hash` → base64url digest.
 * @param {string} plaintext
 * @returns {string}
 */
export function hashToken(plaintext) {
  return hash(plaintext, tokenSecret());
}

/**
 * Timing-safe equality for stored vs computed token hashes.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function safeEqualToken(a, b) {
  try {
    return tse(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
