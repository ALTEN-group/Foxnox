// @ts-check
import { isStringOfLength, isValidInteger } from "@dwtechs/checkard";

/**
 * Validates the compare payload and builds the internal filters for pEnt.get,
 * so an unfiltered query can never leak another user's pwdHash to compare().
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 */
export function checkCompareBody(req, _res, next) {
  const { userId, pwd } = req.body ?? {};
  if (!isValidInteger(userId, 1, undefined, true))
    return next({ statusCode: 400, message: "Missing or invalid userId" });
  if (!isStringOfLength(pwd, 1, 255))
    return next({ statusCode: 400, message: "Missing or invalid pwd" });
  req.body.filters = { userId: { value: userId, matchMode: "=" } }; // internal lookup detail, not client-facing
  next();
}
