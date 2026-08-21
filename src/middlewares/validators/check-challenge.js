// @ts-check
import { isValidInteger } from "@dwtechs/checkard";
import { isChallengeKind } from "../../services/challenge.js";

/**
 * Validate and normalize the login-challenge creation payload.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} _res
 * @param {import("express").NextFunction} next
 */
export function checkChallengeBody(req, _res, next) {
  const userId = Number(req.body?.userId);
  const kind = String(req.body?.kind ?? "").trim();

  if (!isValidInteger(userId, 1, undefined, true)) {
    return next({
      statusCode: 400,
      message: "userId must be a positive integer",
    });
  }
  if (!isChallengeKind(kind)) {
    return next({
      statusCode: 400,
      message:
        'kind must be "2fa", "expired-password", or "trusted-device"',
    });
  }

  req.body.userId = userId;
  req.body.kind = kind;
  next();
}
