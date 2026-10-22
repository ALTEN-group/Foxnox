// @ts-check
import {
  getTranslations,
  saveTranslations,
  TRANSLATION_LANGS,
} from "../../services/security-question-trans.js";

/**
 * Adds `transEn` / `transFr` to the security questions found by the search.
 *
 * @type {import("express").RequestHandler}
 */
export async function attachTranslations(_req, res, next) {
  try {
    const rows = res.locals.rows;
    if (!Array.isArray(rows)) return next();
    const byId = await getTranslations(rows.map((r) => Number(r.id)));
    for (const row of rows) {
      const trans = byId.get(Number(row.id)) ?? {};
      for (const [lang, prop] of Object.entries(TRANSLATION_LANGS)) {
        row[prop] = trans[lang] ?? "";
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Persists the translations of the rows just inserted or updated (rows carry
 * their `id` once the entity add/update has run).
 *
 * @type {import("express").RequestHandler}
 */
export async function persistTranslations(_req, res, next) {
  try {
    if (Array.isArray(res.locals.rows)) {
      await saveTranslations(res.locals.rows, res.locals.consumer);
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * The translation fields live in another table, so the entity declares no
 * operation for them. Advertise them as readable and writable in the schema,
 * which the admin uses to decide which form fields are editable.
 *
 * @type {import("express").RequestHandler}
 */
export function exposeTranslationFields(_req, res, next) {
  const props = new Set(Object.values(TRANSLATION_LANGS));
  for (const row of res.locals.rows ?? []) {
    if (props.has(row.key)) row.operations = ["SELECT", "INSERT", "UPDATE"];
  }
  next();
}

// Saving a question runs two statements (the entity write, then the translations):
// entries of the same author this close belong to one save.
const SAVE_WINDOW_MS = 2000;

/**
 * Collapses the history entries produced by a single save into one, so editing
 * a translation does not show up as two modifications. The first entry keeps its
 * operation and date, the last one provides the final snapshot.
 *
 * @type {import("express").RequestHandler}
 */
export function mergeSaveHistory(_req, res, next) {
  const rows = res.locals.rows;
  if (!Array.isArray(rows)) return next();
  /** @type {Array<Record<string, any>>} */
  const merged = [];
  /** @type {number} */
  let lastTime = Number.NEGATIVE_INFINITY;
  for (const row of rows) {
    const time = new Date(row.tstamp).getTime();
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.userId === row.userId &&
      time - lastTime <= SAVE_WINDOW_MS
    ) {
      prev.record = row.record;
    } else {
      merged.push({ ...row });
    }
    lastTime = time;
  }
  if (merged.length === 1 && merged[0].operation === "INSERT") {
    return next({ statusCode: 404, message: "history not found" });
  }
  res.locals.rows = merged;
  res.locals.total = merged.length;
  next();
}
