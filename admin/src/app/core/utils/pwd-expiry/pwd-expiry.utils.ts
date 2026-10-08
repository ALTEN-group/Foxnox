/**
 * Password expiry rule, shared with the API and the DB trigger:
 * NULL, or tomorrow (UTC calendar day) or later.
 */

/** Earliest accepted instant: 00:00 UTC of tomorrow's UTC calendar day. */
function earliestInstant(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
}

/** Local-midnight Date of tomorrow's UTC calendar day, for the picker `dateMin`. */
export function pwdExpiryDateMin(now: Date = new Date()): Date {
  return new Date(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
}

/**
 * Turns the picked calendar day (local midnight) into 12:00 UTC of that same
 * day, so the stored instant satisfies the UTC rule whatever the user's timezone.
 */
export function toPwdExpiryInstant(picked: Date): Date {
  return new Date(
    Date.UTC(picked.getFullYear(), picked.getMonth(), picked.getDate(), 12),
  );
}

/**
 * Value to send for `pwdExpiry` on update, or `undefined` to leave it out.
 * - null (clear) is sent as is.
 * - a picked day (local midnight) becomes 12:00 UTC of that day.
 * - any other value is the stored one sent back by the full-row update: kept
 *   when still valid, omitted when already in the past (unchanged expired row,
 *   the picker cannot produce it) so editing other fields keeps working.
 */
export function pwdExpiryForUpdate(
  value: Date | string | null | undefined,
  now: Date = new Date(),
): Date | null | undefined {
  if (value === null || value === undefined) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  const isPickedDay =
    d.getHours() === 0 &&
    d.getMinutes() === 0 &&
    d.getSeconds() === 0 &&
    d.getMilliseconds() === 0;
  const candidate = isPickedDay ? toPwdExpiryInstant(d) : d;
  return candidate.getTime() >= earliestInstant(now).getTime()
    ? candidate
    : undefined;
}
