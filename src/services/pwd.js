// @ts-check
import { execute } from "@dwtechs/antity-pgsql";
import { encrypt } from "@dwtechs/hashitaka";
import { isValidPassword } from "@dwtechs/passken";
import { init as initPasskenGenerator } from "@dwtechs/passken-express";
import { log } from "@dwtechs/winstan";
import pEnt from "../entities/pwd.js";
import ppEnt from "../entities/pwd-policy.js";
import { tokenSecret } from "./token-crypto.js";

const SYSTEM_CONSUMER = Object.freeze({ userId: -1, nickname: "system" });

// passken's randomPwd() validates len with isValidInteger(len, 12, 64) and silently
// falls back to 12 when it fails, so a policy outside this range cannot be honoured.
const GENERATED_LENGTH_MIN = 12;
const GENERATED_LENGTH_MAX = 64;

// Consecutive wrong passwords allowed before the account locks, and how long the lock
// lasts, when the policy row does not specify its own (e.g. no active policy).
const DEFAULT_MAX_FAILED_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_MINUTES = 15;

/**
 * @typedef {{
 *   id: number,
 *   length: number,
 *   number: boolean,
 *   symbol: boolean,
 *   lowerCase: boolean,
 *   upperCase: boolean,
 *   strict: boolean,
 *   expiryDays: number,
 *   maxFailedAttempts: number,
 *   lockoutMinutes: number,
 * }} PwdPolicy
 */

/**
 * The password policy used to validate user-chosen passwords.
 * There is only ever one non-archived `pwd_policy` row.
 * @returns {Promise<PwdPolicy|null>}
 */
export async function getActivePwdPolicy() {
  // getCache always ANDs `archived IS FALSE` and orders by id ASC.
  const rows = await ppEnt.getCache();
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    length: Number(row.length) || 12,
    number: Boolean(row.number),
    symbol: Boolean(row.symbol),
    lowerCase: Boolean(row.lowerCase),
    upperCase: Boolean(row.upperCase),
    strict: Boolean(row.strict),
    expiryDays: Number(row.expiryDays) || 0,
    maxFailedAttempts:
      Number(row.maxFailedAttempts) || DEFAULT_MAX_FAILED_ATTEMPTS,
    lockoutMinutes: Number(row.lockoutMinutes) || DEFAULT_LOCKOUT_MINUTES,
  };
}

/**
 * Point passken's password generator at the active `pwd_policy` row.
 *
 * `POST /foxnox/` mints passwords through passken-express's `create`, which reads a
 * module-level option set that only `init()` populates. Without this call the
 * generator silently uses the library defaults — where `sym` is the one character
 * class defaulting to false — so generated passwords would carry no special
 * characters even though every seeded policy sets `symbol = TRUE`, and would fail
 * the same `passwordMeetsPolicy()` check applied to user-chosen passwords.
 *
 * Note `pwd_policy.symbols` (the custom pool) still cannot be honoured: randomPwd
 * always draws from its own built-in symbol list and takes no pool argument.
 *
 * Never throws — a policy that cannot be read leaves the library defaults in place
 * rather than preventing the service from starting.
 *
 * @returns {Promise<void>}
 */
export async function initPwdGeneration() {
  /** @type {PwdPolicy|null} */
  let policy = null;
  try {
    policy = await getActivePwdPolicy();
  } catch (err) {
    log.error(
      `initPwdGeneration: cannot read pwd_policy, keeping passken defaults (no symbols) - caused by: ${err.message || err}`,
    );
    return;
  }

  if (!policy) {
    log.warn(
      "initPwdGeneration: no active pwd_policy row, keeping passken defaults (no symbols)",
    );
    return;
  }

  const len = Math.min(
    Math.max(policy.length, GENERATED_LENGTH_MIN),
    GENERATED_LENGTH_MAX,
  );
  if (len !== policy.length)
    log.warn(
      `initPwdGeneration: pwd_policy #${policy.id} length ${policy.length} is outside passken's [${GENERATED_LENGTH_MIN}, ${GENERATED_LENGTH_MAX}] range, generating ${len} characters instead`,
    );

  initPasskenGenerator({
    len,
    num: policy.number,
    ucase: policy.upperCase,
    lcase: policy.lowerCase,
    sym: policy.symbol,
    strict: policy.strict,
  });

  log.info(
    `Password generation follows pwd_policy #${policy.id}: ${len} chars, symbols ${policy.symbol ? "on" : "off"}`,
  );
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
    // @ts-expect-error
    err.code = "WEAK_PASSWORD";
    throw err;
  }

  const pwdId = await findActivePwdId(userId);
  if (pwdId == null) {
    log.error(`rotatePassword: no active pwd row for userId=${userId}`);
    const err = new Error("Password row not found");
    // @ts-expect-error
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
    // @ts-expect-error
    err.code = "PWD_NOT_FOUND";
    throw err;
  }

  log.info(`password rotated userId=${userId}`);
  return { updated: true };
}

/**
 * Bump the failed-attempt counter after a wrong password, locking the account
 * once the active policy's maxFailedAttempts is reached.
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function recordFailedAttempt(userId) {
  const pwdId = await findActivePwdId(userId);
  if (pwdId == null) return;
  const policy = await getActivePwdPolicy();
  const maxFailedAttempts =
    policy?.maxFailedAttempts ?? DEFAULT_MAX_FAILED_ATTEMPTS;
  const lockoutMinutes = policy?.lockoutMinutes ?? DEFAULT_LOCKOUT_MINUTES;
  await execute(
    `UPDATE pwd
     SET "failedAttempts" = "failedAttempts" + 1,
         "lockedUntil" = CASE
           WHEN "failedAttempts" + 1 >= $2 THEN NOW() + ($3 || ' minutes')::interval
           ELSE "lockedUntil"
         END,
         "updatedAt" = NOW(),
         "updaterId" = -1,
         "updaterName" = 'system'
     WHERE id = $1`,
    [pwdId, maxFailedAttempts, lockoutMinutes],
    null,
  );
}

/**
 * Clear the failed-attempt counter after a correct password.
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function resetFailedAttempts(userId) {
  const pwdId = await findActivePwdId(userId);
  if (pwdId == null) return;
  await execute(
    `UPDATE pwd
     SET "failedAttempts" = 0,
         "lockedUntil" = NULL,
         "updatedAt" = NOW(),
         "updaterId" = -1,
         "updaterName" = 'system'
     WHERE id = $1 AND ("failedAttempts" > 0 OR "lockedUntil" IS NOT NULL)`,
    [pwdId],
    null,
  );
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
    // @ts-expect-error
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
    // @ts-expect-error
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
    // @ts-expect-error
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
    // @ts-expect-error
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
