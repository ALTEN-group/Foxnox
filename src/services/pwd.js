// @ts-check
import { execute } from "@dwtechs/antity-pgsql";
import { encrypt } from "@dwtechs/hashitaka";
import { isValidPassword } from "@dwtechs/passken";
import { log } from "@dwtechs/winstan";
import pEnt from "../entities/pwd.js";
import ppEnt from "../entities/pwd-policy.js";
import { tokenSecret } from "./token-crypto.js";

const SYSTEM_CONSUMER = Object.freeze({ userId: -1, nickname: "system" });

/**
 * @typedef {{
 *   id: number,
 *   length: number,
 *   number: boolean,
 *   symbol: boolean,
 *   lowerCase: boolean,
 *   upperCase: boolean,
 *   expiryDays: number,
 * }} PwdPolicy
 */

/**
 * Active password policy used to validate user-chosen passwords.
 * @returns {Promise<PwdPolicy|null>}
 */
export async function getActivePwdPolicy() {
  // getCache always ANDs `archived IS FALSE` and orders by id ASC.
  const rows = await ppEnt.getCache({
    active: { value: true, matchMode: "equals" },
  });
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    length: Number(row.length) || 12,
    number: Boolean(row.number),
    symbol: Boolean(row.symbol),
    lowerCase: Boolean(row.lowerCase),
    upperCase: Boolean(row.upperCase),
    expiryDays: Number(row.expiryDays) || 0,
  };
}

/**
 * HTML form constraints from the active policy (browser hints only —
 * server still enforces via `passwordMeetsPolicy`).
 *
 * @returns {Promise<{ minLength: number, maxLength: number }>}
 */
export async function getPasswordFormPolicy() {
  const p = await getActivePwdPolicy();
  return {
    minLength: p?.length ?? 12,
    maxLength: 64,
  };
}

/**
 * @param {string} plaintext
 * @param {PwdPolicy|null} [policy]
 * @returns {Promise<boolean>}
 */
export async function passwordMeetsPolicy(plaintext, policy) {
  const p = policy ?? (await getActivePwdPolicy());
  if (!p) {
    return isValidPassword(plaintext);
  }
  return isValidPassword(plaintext, {
    minLen: p.length,
    maxLen: 64,
    num: p.number,
    sym: p.symbol,
    lcase: p.lowerCase,
    ucase: p.upperCase,
  });
}

/**
 * @param {number} userId
 * @returns {Promise<number|null>} pwd row id
 */
async function findActivePwdId(userId) {
  const { query, args } = pEnt.query.select(0, 1, "id", "ASC", {
    userId: { value: userId, matchMode: "equals" },
    archived: { value: false, matchMode: "equals" },
  });
  const res = await execute(query, args, null);
  const id = res.rows?.[0]?.id;
  return id == null ? null : Number(id);
}

/**
 * Hash + store a new password for the user. Also clears lockout counters.
 *
 * @param {number} userId
 * @param {string} plaintext
 * @returns {Promise<{ updated: boolean }>}
 */
export async function rotatePassword(userId, plaintext) {
  const policy = await getActivePwdPolicy();
  if (!(await passwordMeetsPolicy(plaintext, policy))) {
    const err = new Error("Password does not meet the security policy");
    // @ts-ignore
    err.code = "WEAK_PASSWORD";
    throw err;
  }

  const pwdId = await findActivePwdId(userId);
  if (pwdId == null) {
    log.error(`rotatePassword: no active pwd row for userId=${userId}`);
    const err = new Error("Password row not found");
    // @ts-ignore
    err.code = "PWD_NOT_FOUND";
    throw err;
  }

  const pwdHash = await encrypt(plaintext, tokenSecret());
  const now = new Date();
  /** @type {Date|null} */
  let pwdExpiry = null;
  if (policy?.expiryDays && policy.expiryDays > 0) {
    pwdExpiry = new Date(now.getTime() + policy.expiryDays * 86_400_000);
  }

  const { query, args } = pEnt.query.update(
    [
      {
        id: pwdId,
        pwdHash,
        pwdUpdatedAt: now,
        pwdExpiry,
        failedAttempts: 0,
        lockedUntil: null,
      },
    ],
    SYSTEM_CONSUMER,
  );
  const updated = await execute(query, args, null);

  if (Number(updated.rowCount ?? 0) < 1) {
    log.error(`rotatePassword: update failed for userId=${userId} id=${pwdId}`);
    const err = new Error("Password row not found");
    // @ts-ignore
    err.code = "PWD_NOT_FOUND";
    throw err;
  }

  log.info(`password rotated userId=${userId}`);
  return { updated: true };
}

/**
 * Clear lockout fields after a successful unlock workflow.
 * @param {number} userId
 * @returns {Promise<{ updated: boolean }>}
 */
export async function unlockAccount(userId) {
  const pwdId = await findActivePwdId(userId);
  if (pwdId == null) {
    log.error(`unlockAccount: no active pwd row for userId=${userId}`);
    const err = new Error("Password row not found");
    // @ts-ignore
    err.code = "PWD_NOT_FOUND";
    throw err;
  }

  const { query, args } = pEnt.query.update(
    [
      {
        id: pwdId,
        failedAttempts: 0,
        lockedUntil: null,
      },
    ],
    SYSTEM_CONSUMER,
  );
  const updated = await execute(query, args, null);

  if (Number(updated.rowCount ?? 0) < 1) {
    log.error(`unlockAccount: update failed for userId=${userId} id=${pwdId}`);
    const err = new Error("Password row not found");
    // @ts-ignore
    err.code = "PWD_NOT_FOUND";
    throw err;
  }

  log.info(`account unlocked userId=${userId}`);
  return { updated: true };
}

/**
 * Auth-relevant public fields for a user's active pwd row.
 *
 * @param {number} userId
 * @returns {Promise<{
 *   id: number,
 *   userId: number,
 *   twoFactorEnabled: boolean,
 *   pwdExpiry: Date|null,
 *   lockedUntil: Date|null,
 *   failedAttempts: number,
 * }|null>}
 */
export async function getPwdAuthState(userId) {
  const res = await execute(
    `SELECT id, "userId", "twoFactorEnabled", "pwdExpiry", "lockedUntil", "failedAttempts"
     FROM pwd
     WHERE "userId" = $1 AND archived IS NOT TRUE
     ORDER BY id ASC
     LIMIT 1`,
    [userId],
    null,
  );
  const row = res.rows?.[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: Number(row.userId),
    twoFactorEnabled: Boolean(row.twoFactorEnabled),
    pwdExpiry: row.pwdExpiry ? new Date(row.pwdExpiry) : null,
    lockedUntil: row.lockedUntil ? new Date(row.lockedUntil) : null,
    failedAttempts: Number(row.failedAttempts) || 0,
  };
}

/**
 * @param {number} userId
 * @returns {Promise<string|null>}
 */
export async function getTwoFactorSecret(userId) {
  const res = await execute(
    `SELECT "twoFactorSecret"
     FROM pwd
     WHERE "userId" = $1 AND archived IS NOT TRUE
     ORDER BY id ASC
     LIMIT 1`,
    [userId],
    null,
  );
  const secret = res.rows?.[0]?.twoFactorSecret;
  return secret ? String(secret) : null;
}

/**
 * @param {number} userId
 * @param {string} secret base32
 * @returns {Promise<void>}
 */
export async function enableTwoFactor(userId, secret) {
  const pwdId = await findActivePwdId(userId);
  if (pwdId == null) {
    const err = new Error("Password row not found");
    // @ts-ignore
    err.code = "PWD_NOT_FOUND";
    throw err;
  }
  const { query, args } = pEnt.query.update(
    [
      {
        id: pwdId,
        twoFactorSecret: secret,
        twoFactorEnabled: true,
      },
    ],
    SYSTEM_CONSUMER,
  );
  await execute(query, args, null);
  log.info(`two-factor enabled userId=${userId}`);
}

/**
 * Clear TOTP after account-recovery (lost authenticator).
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function disableTwoFactor(userId) {
  const pwdId = await findActivePwdId(userId);
  if (pwdId == null) {
    const err = new Error("Password row not found");
    // @ts-ignore
    err.code = "PWD_NOT_FOUND";
    throw err;
  }
  await execute(
    `UPDATE pwd
     SET "twoFactorSecret" = NULL,
         "twoFactorEnabled" = FALSE,
         "updatedAt" = NOW(),
         "updaterId" = -1,
         "updaterName" = 'system'
     WHERE id = $1`,
    [pwdId],
    null,
  );
  log.info(`two-factor disabled userId=${userId}`);
}
