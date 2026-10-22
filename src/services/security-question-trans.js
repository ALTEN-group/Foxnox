// @ts-check
import { execute } from "@dwtechs/antity-pgsql";
import { isString } from "@dwtechs/checkard";

/**
 * Languages editable from the admin. Only these are served by the web workflows
 * (see web/locales). Keep in sync with the `trans*` fields of
 * entities/security-question.js, the admin question.conf.ts and the history
 * trigger of security_question (db/liquibase/foxnox/versions/05-trig/03-question.sql).
 *
 * @type {Record<string, string>} language → row property
 */
export const TRANSLATION_LANGS = { en: "transEn", fr: "transFr" };

const LANGS = Object.keys(TRANSLATION_LANGS);

/**
 * Translations of the given questions, keyed by question id.
 *
 * @param {number[]} ids
 * @returns {Promise<Map<number, Record<string, string>>>}
 */
export async function getTranslations(ids) {
  const byId = new Map();
  if (ids.length === 0) return byId;
  const res = await execute(
    `SELECT "questionId", lang, trans
     FROM security_question_trans
     WHERE "questionId" = ANY($1::int[])
       AND lang = ANY($2::text[])`,
    [ids, LANGS],
    null,
  );
  for (const row of res.rows ?? []) {
    const id = Number(row.questionId);
    byId.set(id, { ...byId.get(id), [row.lang]: String(row.trans) });
  }
  return byId;
}

/**
 * Upserts the non-empty translations and deletes the emptied ones, only where
 * they differ from the database. A property absent from the row is left
 * untouched. The questions whose translations changed are then touched so their
 * history records the new translations.
 *
 * @param {Array<Record<string, unknown>>} rows rows carrying an `id`
 * @param {{ userId?: number, nickname?: string }} [consumer] author of the change
 * @returns {Promise<void>}
 */
export async function saveTranslations(rows, consumer) {
  const existing = await getTranslations(rows.map((row) => Number(row.id)));
  /** @type {number[]} */ const upIds = [];
  /** @type {string[]} */ const upLangs = [];
  /** @type {string[]} */ const upTrans = [];
  /** @type {number[]} */ const delIds = [];
  /** @type {string[]} */ const delLangs = [];

  for (const row of rows) {
    const id = Number(row.id);
    for (const [lang, prop] of Object.entries(TRANSLATION_LANGS)) {
      if (row[prop] === undefined) continue;
      const value = isString(row[prop]) ? String(row[prop]).trim() : "";
      const current = existing.get(id)?.[lang];
      if (value === (current ?? "")) continue;
      if (value) {
        upIds.push(id);
        upLangs.push(lang);
        upTrans.push(value);
      } else {
        delIds.push(id);
        delLangs.push(lang);
      }
    }
  }

  if (upIds.length > 0) {
    await execute(
      `INSERT INTO security_question_trans ("questionId", lang, trans)
       SELECT * FROM unnest($1::int[], $2::text[], $3::text[])
       ON CONFLICT ("questionId", lang) DO UPDATE SET trans = EXCLUDED.trans`,
      [upIds, upLangs, upTrans],
      null,
    );
  }
  if (delIds.length > 0) {
    await execute(
      `DELETE FROM security_question_trans t
       USING unnest($1::int[], $2::text[]) AS d("questionId", lang)
       WHERE t."questionId" = d."questionId" AND t.lang = d.lang`,
      [delIds, delLangs],
      null,
    );
  }

  const changedIds = [...new Set([...upIds, ...delIds])];
  if (changedIds.length > 0 && consumer?.userId !== undefined) {
    await execute(
      `UPDATE security_question
       SET "updatedAt" = NOW(), "updaterId" = $2, "updaterName" = $3
       WHERE id = ANY($1::int[])`,
      [changedIds, consumer.userId, consumer.nickname ?? "system"],
      null,
    );
  }
}
