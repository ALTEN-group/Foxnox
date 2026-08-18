// @ts-check
import { deleteProps } from "@dwtechs/sparray";

/**
 * Terminal JSON response that strips `isPrivate` entity fields.
 *
 * Use for any route whose rows may include secrets (hashes, 2FA secrets, …).
 * Internal middlewares still see the full row upstream; scrubbing is outbound only.
 *
 * @param {{ privateProps: string[] }} ent antity-pgsql SQLEntity (or compatible)
 * @returns {import("express").RequestHandler}
 */
export function sendPrivate(ent) {
  return function sendPrivateRows(_req, res) {
    const raw = res.locals.rows;
    // No matched handler left rows (e.g. fall-through) — don't crash deleteProps.
    if (!Array.isArray(raw)) {
      return res.status(404).json({ message: "Not found" });
    }
    const rows = deleteProps(raw, ent.privateProps);
    res.status(200).json({ rows, total: res.locals.total });
  };
}
