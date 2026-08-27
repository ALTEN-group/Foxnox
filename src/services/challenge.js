// @ts-check
import { buildDeepLink } from "../web/deep-link.js";
import {
  consumeWorkflowToken,
  createWorkflowToken,
  findValidWorkflowToken,
  TOKEN_TYPES,
} from "./token.js";

/**
 * Mid-login challenges (not email magic links).
 * Compare flow mints one via POST /foxnox/challenges after password OK;
 * SSR pages bind GET/POST to the matching token type before mutating anything.
 *
 * @typedef {"2fa" | "expired-password" | "trusted-device"} ChallengeKind
 */

/** @type {Readonly<Record<ChallengeKind, { typeName: string, path: string }>>} */
export const CHALLENGE_KINDS = Object.freeze({
  "2fa": {
    typeName: TOKEN_TYPES.TWO_FA_CHALLENGE,
    path: "/2fa/verify",
  },
  "expired-password": {
    typeName: TOKEN_TYPES.EXPIRED_PASSWORD_CHALLENGE,
    path: "/password/expired",
  },
  "trusted-device": {
    typeName: TOKEN_TYPES.TRUSTED_DEVICE_CHALLENGE,
    path: "/trusted-devices/prompt",
  },
});

/**
 * @param {string} kind
 * @returns {kind is ChallengeKind}
 */
export function isChallengeKind(kind) {
  return Object.hasOwn(CHALLENGE_KINDS, kind);
}

/**
 * @param {ChallengeKind} kind
 * @returns {{ typeName: string, path: string }}
 */
export function getChallengeSpec(kind) {
  const spec = CHALLENGE_KINDS[kind];
  if (!spec) throw new Error(`Unknown challenge kind: ${kind}`);
  return spec;
}

/**
 * Mint a login challenge for a user. Plaintext is returned once for the redirect URL.
 *
 * @param {{ userId: number, kind: ChallengeKind }} params
 * @returns {Promise<{
 *   id: number,
 *   kind: ChallengeKind,
 *   challenge: string,
 *   path: string,
 *   url: string,
 *   expiresAt: Date,
 *   typeName: string,
 * }>}
 */
export async function createLoginChallenge({ userId, kind }) {
  const spec = getChallengeSpec(kind);
  const token = await createWorkflowToken({
    userId,
    typeName: spec.typeName,
  });
  const url = buildDeepLink(spec.path, { challenge: token.plaintext });
  return {
    id: token.id,
    kind,
    challenge: token.plaintext,
    path: spec.path,
    url,
    expiresAt: token.expiresAt,
    typeName: token.typeName,
  };
}

/**
 * Resolve a still-valid challenge of the expected kind.
 *
 * @param {{ plaintext: string, kind: ChallengeKind }} params
 * @returns {Promise<{ id: number, userId: number, attempts: number, maxAttempts: number, expiresAt: Date } | null>}
 */
export async function findValidLoginChallenge({ plaintext, kind }) {
  const spec = getChallengeSpec(kind);
  return findValidWorkflowToken({
    plaintext,
    typeName: spec.typeName,
  });
}

/**
 * @param {number} challengeId
 * @returns {Promise<void>}
 */
export async function consumeLoginChallenge(challengeId) {
  await consumeWorkflowToken(challengeId);
}
