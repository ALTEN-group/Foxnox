// @ts-check
import { isDate } from "@dwtechs/checkard";

/**
 * Antity normalizer for every `date` property.
 *
 * JSON cannot carry a `Date`, so callers send epoch milliseconds
 * (`1787332073835`) or an ISO-8601 string (`"2026-08-21T17:07:36.463Z"`), and a
 * row fetched with `POST /search` comes back as a string that clients re-send
 * as-is on the next `PUT`. Checkard's `isValidDate` only accepts a real `Date`
 * instance, so all of those payloads were rejected with a 400 before reaching
 * the query builder. Antity runs `normalize` before `validate`, which is why the
 * coercion belongs here.
 *
 * Values that cannot be parsed are returned untouched so validation still fails
 * with the usual `Invalid "<key>"` 400 instead of storing an `Invalid Date`.
 *
 * @param {unknown} v
 * @returns {unknown}
 */
export function toDate(v) {
  if (isDate(v)) return v;
  const ms = toEpochMs(v);
  if (ms === null) return v;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? v : d;
}

/**
 * @param {unknown} v
 * @returns {number | null}
 */
function toEpochMs(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  // Epoch milliseconds sent as a string: `Date.parse("1787332073835")` reads
  // that as a year, so digits-only strings are converted numerically.
  const ms = /^-?\d+$/.test(v) ? Number(v) : Date.parse(v);
  return Number.isNaN(ms) ? null : ms;
}
