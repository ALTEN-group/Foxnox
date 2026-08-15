// @ts-check
import { deleteProps } from "@dwtechs/sparray";
import pEnt from "../../entities/pwd.js";

/**
 * Terminal response handler for `/pwd/` routes.
 *
 * Mirrors the generic `send` shape (`{ rows, total }`) but strips any
 * `isPrivate: true` properties (e.g. `pwdHash`, `twoFactorSecret`) from
 * `res.locals.rows` first. Internal middlewares like
 * `@dwtechs/passken-express`'s `compare` still see the full row upstream —
 * the scrub only happens on the way out.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export function sendPwd(_req, res) {
  const raw = res.locals.rows;
  // No matched handler left rows (e.g. fall-through) — don't crash deleteProps.
  if (!Array.isArray(raw)) {
    return res.status(404).json({ message: "Not found" });
  }
  const rows = deleteProps(raw, pEnt.privateProps);
  res.status(200).json({ rows, total: res.locals.total });
}
