// @ts-check
import { isValidInteger } from "@dwtechs/checkard";
import { acquireCompareLock } from "../../services/compare-lock.js";

/**
 * Hold a per-userId lock until this compare response finishes, so the next
 * compare for the same account sees the lockout bump from this one.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export function serializeCompare(req, res, next) {
  const userId = req.body?.userId;
  if (!isValidInteger(userId, 1, undefined, true)) return next();

  acquireCompareLock(userId)
    .then((release) => {
      const done = () => {
        res.off("finish", done);
        res.off("close", done);
        release();
      };
      res.on("finish", done);
      res.on("close", done);
      next();
    })
    .catch(next);
}
