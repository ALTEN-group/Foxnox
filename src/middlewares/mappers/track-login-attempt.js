// @ts-check
import { log } from "@dwtechs/winstan";
import {
  recordFailedAttempt,
  resetFailedAttempts,
} from "../../services/pwd.js";

/**
 * Runs after a successful compare: clears the lockout counters and reflects
 * that in the row about to be sent back, so the caller never sees stale
 * failedAttempts/lockedUntil from before the reset.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export function clearLoginAttempts(req, res, next) {
  const row = res.locals?.rows?.[0];
  if (row && (row.failedAttempts > 0 || row.lockedUntil)) {
    row.failedAttempts = 0;
    row.lockedUntil = null;
  }
  resetFailedAttempts(req.body.userId).catch((err) =>
    log.error(
      `clearLoginAttempts: could not reset failed attempts for userId=${req.body.userId} - caused by: ${err.message || err}`,
    ),
  );
  next();
}

/**
 * Runs when compare rejects the password (401): bumps the failed-attempt
 * counter, then re-raises the original error unchanged.
 *
 * @param {{ statusCode?: number }} err
 * @param {import("express").Request} req
 * @param {import("express").Response} _res
 * @param {import("express").NextFunction} next
 */
export function trackFailedAttempt(err, req, _res, next) {
  if (err?.statusCode === 401) {
    recordFailedAttempt(req.body.userId).catch((e) =>
      log.error(
        `trackFailedAttempt: could not record failed attempt for userId=${req.body.userId} - caused by: ${e.message || e}`,
      ),
    );
  }
  next(err);
}
