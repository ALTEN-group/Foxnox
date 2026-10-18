// @ts-check
import { isValidInteger } from "@dwtechs/checkard";
import { deleteFavicon, saveFavicon } from "../../services/branding-favicon.js";
import { deleteLogo, saveLogo } from "../../services/branding-logo.js";

/**
 * PUT /branding/:id/<image> — stores the validated image (`res.locals[localsKey]`)
 * and leaves the updated row in `res.locals.rows` for the terminal `send`.
 *
 * @param {typeof saveLogo} save
 * @param {string} localsKey
 * @returns {import('express').RequestHandler}
 */
const saveHandler = (save, localsKey) => async (req, res, next) => {
  const id = Number(req.params.id);
  if (!isValidInteger(id, 1, undefined, false))
    return next({ statusCode: 400, message: "Invalid branding id" });
  try {
    const row = await save(id, res.locals.consumer, res.locals[localsKey]);
    if (!row) return next({ statusCode: 404, message: "Branding not found" });
    res.locals.rows = [row];
    res.locals.total = 1;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /branding/:id/<image> — removes the stored image and leaves the
 * updated row in `res.locals.rows` for the terminal `send`.
 *
 * @param {typeof deleteLogo} remove
 * @returns {import('express').RequestHandler}
 */
const deleteHandler = (remove) => async (req, res, next) => {
  const id = Number(req.params.id);
  if (!isValidInteger(id, 1, undefined, false))
    return next({ statusCode: 400, message: "Invalid branding id" });
  try {
    const row = await remove(id, res.locals.consumer);
    if (!row) return next({ statusCode: 404, message: "Branding not found" });
    res.locals.rows = [row];
    res.locals.total = 1;
    next();
  } catch (err) {
    next(err);
  }
};

export const saveBrandingLogo = saveHandler(saveLogo, "logo");
export const deleteBrandingLogo = deleteHandler(deleteLogo);
export const saveBrandingFavicon = saveHandler(saveFavicon, "favicon");
export const deleteBrandingFavicon = deleteHandler(deleteFavicon);
