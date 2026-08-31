// @ts-check
import { log } from "@dwtechs/winstan";

/**
 * Applies a table's column defaults to an insert payload.
 *
 * Antity builds one INSERT column list for the whole batch and binds a missing
 * value as NULL, so a `DEFAULT` declared in SQL never fires through the API: a
 * NOT NULL column left out — or sent as `null` by a create form that only fills
 * part of the row — reaches Postgres as NULL and breaks the constraint.
 * Applying the defaults here keeps those columns optional for the caller.
 *
 * `null` is treated like an omission: on a create form it means "I did not fill
 * this in", and the column cannot hold NULL anyway. Updates take the opposite
 * route — see `dropNulls`, which leaves the stored value untouched instead.
 *
 * @param {Record<string, unknown>} defaults column → value used when unspecified
 * @returns {import("express").RequestHandler}
 */
export function fillDefaults(defaults) {
  const keys = Object.keys(defaults);

  return function fillDefaultsMiddleware(req, _res, next) {
    const rows = req.body?.rows;
    if (!Array.isArray(rows)) return next();

    for (const row of rows) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      for (const key of keys) {
        if (row[key] === undefined || row[key] === null) {
          log.debug(`fillDefaults: "${key}" = ${defaults[key]}`);
          row[key] = defaults[key];
        }
      }
    }
    next();
  };
}
