// @ts-check
import { execute } from "@dwtechs/antity-pgsql";
import { isArray, isValidInteger } from "@dwtechs/checkard";
import pEnt from "../../../entities/preference.js";

/**
 * Fail-closed pre-flight for PUT /preferences/:resource.
 *
 * Verifies that every row in `req.body.rows` (identified by its `id`) satisfies
 * ALL of:
 *   - is owned by the authenticated consumer (`userId = res.locals.consumer.userId`)
 *   - is not a locked system template (`locked IS FALSE`)
 *   - belongs to the URL's `:resource` (`resourceName = :resource`)
 *
 * Runs one bounded `SELECT ... WHERE id IN (...) AND ...` and compares the
 * returned row count to the requested batch size. If any id fails ANY predicate,
 * the row count mismatches and the whole batch is rejected with 403 — no partial
 * updates, no per-row disclosure.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function assertRowsOwnedAndUnlocked(req, res, next) {
  const rows = req.body?.rows;
  if (!isArray(rows, ">", 0))
    return next({ statusCode: 400, message: "Missing rows in req.body" });

  const ids = rows
    .map((r) => r?.id)
    .filter((v) => isValidInteger(v, 1, undefined, true));
  if (ids.length !== rows.length)
    return next({
      statusCode: 400,
      message: "Every row must carry a valid integer id",
    });

  const userId = res.locals.consumer.userId;
  const { resource } = req.params;

  const { query, args } = pEnt.query.select(0, null, null, null, {
    id: { value: ids, matchMode: "in" },
    userId: { value: userId, matchMode: "=" },
    resourceName: { value: resource, matchMode: "=" },
    locked: { value: false, matchMode: "is" },
  });

  try {
    const r = await execute(query, args, null);
    if ((r.rows?.length ?? 0) !== ids.length)
      return next({
        statusCode: 403,
        message:
          "One or more rows are not owned by the caller, are locked, or fall outside the resource scope",
      });
    next();
  } catch (err) {
    next(err);
  }
}
