// @ts-check
import { isValidInteger } from "@dwtechs/checkard";
import { saveLogo } from "../../services/branding-logo.js";

/**
 * PUT /branding/:id/logo — stores the validated image (`res.locals.logo`) and
 * leaves the updated row in `res.locals.rows` for the terminal `send`.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function saveBrandingLogo(req, res, next) {
  const id = Number(req.params.id);
  if (!isValidInteger(id, 1, undefined, false))
    return next({ statusCode: 400, message: "Invalid branding id" });
  try {
    const row = await saveLogo(id, res.locals.consumer, res.locals.logo);
    if (!row) return next({ statusCode: 404, message: "Branding not found" });
    res.locals.rows = [row];
    res.locals.total = 1;
    next();
  } catch (err) {
    next(err);
  }
}
