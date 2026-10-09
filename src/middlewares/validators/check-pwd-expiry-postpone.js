// @ts-check
import { execute } from "@dwtechs/antity-pgsql";
import { isArray } from "@dwtechs/checkard";

const toTime = (/** @type {unknown} */ v) =>
  new Date(/** @type {string|number|Date} */ (v)).getTime();

/**
 * PUT /pwd pre-flight: once a row has a `pwdExpiry`, an update may only postpone
 * it (same value or later). Clearing it (`null`) stays allowed.
 *
 * Dates are compared as JS `Date`s (milliseconds), like the stored value read
 * back by the admin, so an unchanged full-row update is never rejected.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function checkPwdExpiryPostpone(req, _res, next) {
  const rows = req.body?.rows;
  if (!isArray(rows, ">", 0)) return next();

  const changed = rows.filter(
    (r) => Number.isInteger(r?.id) && r.pwdExpiry != null,
  );
  if (!changed.length) return next();

  try {
    const r = await execute(
      `SELECT id, "pwdExpiry" FROM pwd WHERE id = ANY($1::int[])`,
      [[...new Set(changed.map((c) => c.id))]],
      null,
    );
    const stored = new Map(
      (r.rows ?? [])
        .filter((s) => s.pwdExpiry != null)
        .map((s) => [s.id, toTime(s.pwdExpiry)]),
    );
    for (const c of changed) {
      const old = stored.get(c.id);
      if (old !== undefined && toTime(c.pwdExpiry) < old)
        return next({
          statusCode: 400,
          message: "pwdExpiry can only be postponed",
        });
    }
    next();
  } catch (err) {
    next(err);
  }
}
