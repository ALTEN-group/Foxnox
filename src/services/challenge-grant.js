// @ts-check
import { isValidInteger } from "@dwtechs/checkard";

/** How long after a successful compare the BFF may mint a login challenge. */
export const CHALLENGE_MINT_TTL_MS = 5 * 60 * 1000;

/** @type {Map<number, number>} */
const grants = new Map();

/**
 * Record that `userId` just passed password compare. One outstanding grant per user.
 *
 * @param {number} userId
 * @param {number} [now]
 */
export function grantChallengeMint(userId, now = Date.now()) {
  if (!isValidInteger(userId, 1, undefined, true)) return;
  grants.set(userId, now + CHALLENGE_MINT_TTL_MS);
}

/**
 * Consume a compare grant. Returns false when missing or expired.
 *
 * @param {number} userId
 * @param {number} [now]
 * @returns {boolean}
 */
export function consumeChallengeMint(userId, now = Date.now()) {
  const expiresAt = grants.get(userId);
  grants.delete(userId);
  return expiresAt !== undefined && expiresAt > now;
}

/** Test helper: drop every outstanding grant. */
export function clearChallengeMints() {
  grants.clear();
}
