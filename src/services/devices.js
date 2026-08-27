// @ts-check
import { execute } from "@dwtechs/antity-pgsql";
import { log } from "@dwtechs/winstan";
import { hashToken, randomTokenPlaintext } from "./token-crypto.js";

const TRUSTED_DEVICE_COOKIE = "trusted_device";
const DEFAULT_TTL_DAYS = 90;

/** @returns {string} */
export function getTrustedDeviceCookieName() {
  return TRUSTED_DEVICE_COOKIE;
}

/**
 * @param {number} [ttlDays]
 * @returns {{ plaintext: string, hash: string, expiresAt: Date }}
 */
export function mintTrustedDeviceToken(ttlDays = DEFAULT_TTL_DAYS) {
  const plaintext = randomTokenPlaintext(32);
  const hash = hashToken(plaintext);
  const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);
  return { plaintext, hash, expiresAt };
}

/**
 * @param {{
 *   userId: number,
 *   deviceTokenHash: string,
 *   deviceName?: string,
 *   ipAddress?: string,
 *   userAgent?: string,
 *   expiresAt: Date,
 * }} params
 * @returns {Promise<{ id: number }>}
 */
export async function createTrustedDevice(params) {
  const inserted = await execute(
    `INSERT INTO user_trusted_device
       ("userId", "deviceTokenHash", "deviceName", "ipAddress", "userAgent",
        "expiresAt", "lastUsedAt", "creatorId", "creatorName")
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), -1, 'system')
     RETURNING id`,
    [
      params.userId,
      params.deviceTokenHash,
      params.deviceName || null,
      params.ipAddress || null,
      params.userAgent || null,
      params.expiresAt.toISOString(),
    ],
    null,
  );
  const id = inserted.rows?.[0]?.id;
  if (!id) throw new Error("Failed to create trusted device");
  log.info(`trusted device created userId=${params.userId} id=${id}`);
  return { id: Number(id) };
}

/**
 * @param {number} userId
 * @param {string} plaintextCookie
 * @returns {Promise<boolean>}
 */
export async function verifyTrustedDevice(userId, plaintextCookie) {
  if (!plaintextCookie) return false;
  const hash = hashToken(plaintextCookie);
  const res = await execute(
    `SELECT id FROM user_trusted_device
     WHERE "userId" = $1
       AND "deviceTokenHash" = $2
       AND archived IS NOT TRUE
       AND "expiresAt" > NOW()
     LIMIT 1`,
    [userId, hash],
    null,
  );
  const id = res.rows?.[0]?.id;
  if (!id) return false;
  await execute(
    `UPDATE user_trusted_device
     SET "lastUsedAt" = NOW(), "updatedAt" = NOW(),
         "updaterId" = -1, "updaterName" = 'system'
     WHERE id = $1`,
    [id],
    null,
  );
  return true;
}

/**
 * @param {number} userId
 * @returns {Promise<Array<{
 *   id: number,
 *   deviceName: string,
 *   lastUsedAt: string,
 *   expiresAt: string,
 * }>>}
 */
export async function listTrustedDevices(userId) {
  const res = await execute(
    `SELECT id, "deviceName", "lastUsedAt", "expiresAt"
     FROM user_trusted_device
     WHERE "userId" = $1 AND archived IS NOT TRUE
     ORDER BY "lastUsedAt" DESC NULLS LAST, id DESC`,
    [userId],
    null,
  );
  return (res.rows ?? []).map((row) => ({
    id: Number(row.id),
    deviceName: row.deviceName ? String(row.deviceName) : "",
    lastUsedAt: row.lastUsedAt
      ? new Date(row.lastUsedAt).toISOString().slice(0, 10)
      : "",
    expiresAt: row.expiresAt
      ? new Date(row.expiresAt).toISOString().slice(0, 10)
      : "",
  }));
}

/**
 * @param {number} userId
 * @param {number} deviceId
 * @returns {Promise<boolean>}
 */
export async function archiveTrustedDevice(userId, deviceId) {
  const res = await execute(
    `UPDATE user_trusted_device
     SET archived = TRUE,
         "archivedAt" = NOW(),
         "updatedAt" = NOW(),
         "updaterId" = -1,
         "updaterName" = 'system'
     WHERE id = $1 AND "userId" = $2 AND archived IS NOT TRUE`,
    [deviceId, userId],
    null,
  );
  return Number(res.rowCount ?? 0) > 0;
}
