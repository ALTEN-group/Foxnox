// @ts-check

/**
 * Earliest accepted `pwdExpiry`: 00:00 UTC of tomorrow's UTC calendar day.
 * Must stay in sync with the `pwd_expiry_guard` DB trigger and the admin picker.
 * @param {Date} [now]
 * @returns {Date}
 */
export function earliestPwdExpiry(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
}

/**
 * antity custom validator for `pwdExpiry` (replaces the built-in date check).
 * @param {unknown} v
 * @returns {boolean}
 */
export function isValidPwdExpiry(v) {
  const d = v instanceof Date ? v : new Date(/** @type {string|number} */ (v));
  const t = d.getTime();
  return !Number.isNaN(t) && t >= earliestPwdExpiry().getTime();
}
