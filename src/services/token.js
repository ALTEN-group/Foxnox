// @ts-check
import { execute } from "@dwtechs/antity-pgsql";
import { log } from "@dwtechs/winstan";
import {
  hashToken,
  randomTokenPlaintext,
  safeEqualToken,
} from "./token-crypto.js";

/** Seeded `token_type.name` values used by workflows. */
export const TOKEN_TYPES = Object.freeze({
  PASSWORD_RESET: "Password reset",
  ACCOUNT_RECOVERY: "Account recovery",
  ACCOUNT_UNLOCK: "Account unlock",
});

export { hashToken } from "./token-crypto.js";

/**
 * @param {string} typeName
 * @returns {Promise<{ id: number, name: string, ttl: number, maxAttempts: number }>}
 */
async function getTokenType(typeName) {
  const res = await execute(
    `SELECT id, name, ttl, "maxAttempts"
     FROM token_type
     WHERE name = $1 AND archived IS NOT TRUE
     LIMIT 1`,
    [typeName],
    null,
  );
  const row = res.rows?.[0];
  if (!row) {
    throw new Error(`Unknown or archived token type: ${typeName}`);
  }
  return {
    id: Number(row.id),
    name: String(row.name),
    ttl: Number(row.ttl) || 30,
    maxAttempts: Number(row.maxAttempts) || 3,
  };
}

/**
 * Create a workflow token: plaintext goes in the email link; only HMAC is stored.
 *
 * @param {{ userId: number, typeName: string }} params
 * @returns {Promise<{ id: number, plaintext: string, typeName: string, expiresAt: Date }>}
 */
export async function createWorkflowToken({ userId, typeName }) {
  const type = await getTokenType(typeName);
  const plaintext = randomTokenPlaintext(32);
  const hash = hashToken(plaintext);
  const expiresAt = new Date(Date.now() + type.ttl * 60_000);

  // Invalidate previous unused tokens of the same type for this user.
  await execute(
    `UPDATE token
     SET archived = TRUE,
         "archivedAt" = NOW(),
         "updatedAt" = NOW(),
         "updaterId" = -1,
         "updaterName" = 'system'
     WHERE "userId" = $1
       AND "typeId" = $2
       AND archived IS NOT TRUE
       AND "verifiedAt" IS NULL`,
    [userId, type.id],
    null,
  );

  const inserted = await execute(
    `INSERT INTO token (hash, "typeId", "userId", attempts, "expiresAt", "creatorId", "creatorName")
     VALUES ($1, $2, $3, 0, $4, -1, 'system')
     RETURNING id, "expiresAt"`,
    [hash, type.id, userId, expiresAt.toISOString()],
    null,
  );

  const row = inserted.rows?.[0];
  if (!row?.id) {
    throw new Error("Failed to insert workflow token");
  }

  log.info(
    `workflow token created type="${type.name}" userId=${userId} id=${row.id} expiresAt=${expiresAt.toISOString()}`,
  );

  return {
    id: Number(row.id),
    plaintext,
    typeName: type.name,
    expiresAt,
  };
}

/**
 * @param {{ plaintext: string, typeName: string }} params
 * @returns {Promise<{ id: number, userId: number, attempts: number, maxAttempts: number, expiresAt: Date } | null>}
 */
export async function findValidWorkflowToken({ plaintext, typeName }) {
  if (!plaintext) return null;
  const type = await getTokenType(typeName);
  const hash = hashToken(plaintext);

  const res = await execute(
    `SELECT t.id, t."userId", t.attempts, t."expiresAt", t.hash
     FROM token t
     WHERE t."typeId" = $1
       AND t.archived IS NOT TRUE
       AND t."verifiedAt" IS NULL
       AND t."expiresAt" > NOW()
       AND t.hash = $2
     LIMIT 1`,
    [type.id, hash],
    null,
  );

  const row = res.rows?.[0];
  if (!row) return null;
  if (!safeEqualToken(String(row.hash), hash)) return null;

  const attempts = Number(row.attempts) || 0;
  if (attempts >= type.maxAttempts) return null;

  return {
    id: Number(row.id),
    userId: Number(row.userId),
    attempts,
    maxAttempts: type.maxAttempts,
    expiresAt: new Date(row.expiresAt),
  };
}

/**
 * Mark a token as used (verified) and archive it.
 * @param {number} tokenId
 */
export async function consumeWorkflowToken(tokenId) {
  await execute(
    `UPDATE token
     SET "verifiedAt" = NOW(),
         archived = TRUE,
         "archivedAt" = NOW(),
         "updatedAt" = NOW(),
         "updaterId" = -1,
         "updaterName" = 'system'
     WHERE id = $1`,
    [tokenId],
    null,
  );
}

/**
 * Bump failed attempt counter (e.g. wrong security answers).
 * @param {number} tokenId
 */
export async function bumpWorkflowTokenAttempts(tokenId) {
  await execute(
    `UPDATE token
     SET attempts = attempts + 1,
         "updatedAt" = NOW(),
         "updaterId" = -1,
         "updaterName" = 'system'
     WHERE id = $1`,
    [tokenId],
    null,
  );
}
