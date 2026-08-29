// @ts-check
import { log } from "@dwtechs/winstan";

/**
 * Drops the `null`s a PUT payload carries by accident.
 *
 * Clients update a row by re-sending the object they read back from
 * `POST /<entity>/search`, which makes two kinds of `null` meaningless:
 *
 * - **private columns** (`pwdHash`, `twoFactorSecret`, …) are stripped from
 *   every response by `send`, so the caller never had a value to send back.
 *   Antity's update builder includes any key that is not `undefined`, so those
 *   `null`s reached the SET clause: `pwdHash` broke its NOT NULL constraint with
 *   a 500, and `twoFactorSecret` — which is nullable — silently wiped the user's
 *   2FA secret.
 * - **columns required on POST**, which is how this codebase marks a NOT NULL
 *   column: setting one to `null` can only ever fail.
 *
 * Any other `null` is a deliberate erasure (`lockedUntil: null` to unlock,
 * `verifiedAt: null`, …) and is left untouched.
 *
 * @param {object} ent SQLEntity whose properties describe the payload
 * @returns {import("express").RequestHandler}
 */
export function dropNulls(ent) {
  const keys = new Set(
    ent.properties
      .filter((p) => p.isPrivate || p.requiredFor.includes("POST"))
      .map((p) => p.key),
  );

  return function dropNullsMiddleware(req, _res, next) {
    const rows = req.body?.rows;
    if (!Array.isArray(rows)) return next();

    for (const row of rows) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      for (const key of keys) {
        if (row[key] === null) {
          log.debug(
            `dropNulls: ignoring null "${key}" on ${ent.name} id=${row.id}`,
          );
          delete row[key];
        }
      }
    }
    next();
  };
}
