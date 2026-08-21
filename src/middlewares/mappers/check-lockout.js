// @ts-check

/**
 * Blocks a compare when the loaded pwd row is still locked, so a correct
 * password guessed during the lock window is not accepted either.
 *
 * @param {import("express").Request} _req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export function checkLockout(_req, res, next) {
  const row = res.locals?.rows?.[0];
  const lockedUntil = row?.lockedUntil ? new Date(row.lockedUntil) : null;
  if (lockedUntil && lockedUntil.getTime() > Date.now())
    return next({ statusCode: 403, message: "Account locked" });
  next();
}
