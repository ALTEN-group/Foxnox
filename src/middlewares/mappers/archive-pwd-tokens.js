// @ts-check
import { isArray, isObject, isValidInteger } from "@dwtechs/checkard";
import { archiveTokensForPasswords } from "../../services/token.js";

/**
 * Invalidate outstanding workflows before archiving passwords so a failed
 * invalidation leaves the password available for an archive retry.
 *
 * @type {import("express").RequestHandler}
 */
export async function archivePwdTokens(req, res, next) {
  const rows = req.body?.rows;
  if (!isArray(rows, ">", 0))
    return next({ statusCode: 400, message: "Missing rows in req.body" });

  const ids = rows.map((row) => (isObject(row) ? row.id : row));
  if (ids.some((id) => !isValidInteger(id, 1, undefined, false)))
    return next({
      statusCode: 400,
      message: "Invalid password id for archive",
    });

  try {
    await archiveTokensForPasswords(
      [...new Set(ids.map(Number))],
      res.locals.consumer,
      res.locals.dbClient ?? null,
    );
    next();
  } catch (err) {
    next(err);
  }
}
