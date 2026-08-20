// @ts-check
import { deleteProps } from "@dwtechs/sparray";

/**
 * Terminal JSON response for Foxnox CRUD routers.
 *
 * Strips `isPrivate` entity fields, then projects remaining keys onto the
 * Gatelin `x-acl-fields` allow-list when that header is present. Internal
 * middlewares still see the full row upstream; scrubbing is outbound only.
 * History snapshots live under `record` and are projected the same way.
 *
 * @param {{ privateProps: string[] }} ent antity-pgsql SQLEntity (or compatible)
 * @returns {import("express").RequestHandler}
 */
export function send(ent) {
  return function sendRows(req, res) {
    const raw = res.locals.rows;
    // No matched handler left rows (e.g. fall-through) — don't crash deleteProps.
    if (!Array.isArray(raw)) {
      return res.status(404).json({ message: "Not found" });
    }
    const privateProps = ent.privateProps;
    const allowed = parseAclFields(req);
    const rows = projectAcl(
      deleteProps(raw, privateProps).map((row) => {
        if (!row?.record || typeof row.record !== "object") return row;
        const [record] = deleteProps([{ ...row.record }], privateProps);
        return { ...row, record };
      }),
      allowed,
    );
    res.status(200).json({
      rows,
      total: rows.length === raw.length ? res.locals.total : rows.length,
    });
  };
}

/**
 * @param {import("express").Request} req
 * @returns {Set<string>|null} allow-list, or null when unrestricted
 */
function parseAclFields(req) {
  const header = req.headers?.["x-acl-fields"];
  if (header === undefined) return null;
  const raw = Array.isArray(header) ? header.join(",") : String(header);
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * Always keeps `id`. History envelopes keep their own keys and only the nested
 * `record` is projected. Schema descriptors (`key` + `operations`) are dropped
 * when the property is not allowed.
 *
 * @param {Array<object>} rows
 * @param {Set<string>|null} allowed
 * @returns {Array<object>}
 */
function projectAcl(rows, allowed) {
  if (!allowed) return rows;
  const out = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") {
      out.push(row);
      continue;
    }
    if (row.record && typeof row.record === "object" && row.operation) {
      out.push({ ...row, record: pickAllowed(row.record, allowed) });
      continue;
    }
    if (typeof row.key === "string" && Array.isArray(row.operations)) {
      if (row.key === "id" || allowed.has(row.key)) out.push(row);
      continue;
    }
    out.push(pickAllowed(row, allowed));
  }
  return out;
}

/**
 * @param {object} item
 * @param {Set<string>} allowed
 */
function pickAllowed(item, allowed) {
  return Object.fromEntries(
    Object.entries(item).filter(([k]) => k === "id" || allowed.has(k)),
  );
}
