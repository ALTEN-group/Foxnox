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
export function pwdExpiryDateMin(
  now: Date = new Date(),
  original?: Date | string | null,
): Date {
  const tomorrow = new Date(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  if (original == null) return tomorrow;
  const stored = new Date(original);
  if (Number.isNaN(stored.getTime())) return tomorrow;
  // An already-set expiry can only be postponed: its own day is the earliest pick
  const storedDay = new Date(
    stored.getUTCFullYear(),
    stored.getUTCMonth(),
    stored.getUTCDate(),
  );
  return storedDay > tomorrow ? storedDay : tomorrow;
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
 * - with the stored `original` (already set, so postpone-only): picking the
 *   original's own UTC day keeps the original instant, as 12:00 UTC could
 *   otherwise land before it on that same day.
 */
export function pwdExpiryForUpdate(
  value: Date | string | null | undefined,
  now: Date = new Date(),
  original?: Date | string | null,
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
  if (original != null) {
    const stored = new Date(original);
    if (
      !Number.isNaN(stored.getTime()) &&
      candidate < stored &&
      candidate.toISOString().slice(0, 10) === stored.toISOString().slice(0, 10)
    )
      return stored;
  }
  return candidate.getTime() >= earliestInstant(now).getTime()
    ? candidate
    : undefined;
}
