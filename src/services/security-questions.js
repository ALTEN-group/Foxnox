// @ts-check
import { execute } from "@dwtechs/antity-pgsql";
import { compare, encrypt } from "@dwtechs/hashitaka";
import { log } from "@dwtechs/winstan";
import { tokenSecret } from "./token-crypto.js";

/**
 * @typedef {{ id: number, label: string, categoryId?: number }} SecurityQuestion
 */

/**
 * @param {string} [lang]
 * @returns {"en"|"fr"}
 */
function normalizeLang(lang) {
  return String(lang || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
}

/**
 * Active, non-archived questions with localized labels (fallback: en, then key).
 *
 * @param {string} [lang]
 * @returns {Promise<SecurityQuestion[]>}
 */
export async function listSecurityQuestionCatalog(lang = "en") {
  const locale = normalizeLang(lang);
  const res = await execute(
    `SELECT q.id,
            q."categoryId" AS "categoryId",
            COALESCE(t.trans, te.trans, q.question) AS label
     FROM security_question q
     LEFT JOIN security_question_trans t
       ON t."questionId" = q.id AND t.lang = $1
     LEFT JOIN security_question_trans te
       ON te."questionId" = q.id AND te.lang = 'en'
     WHERE q.archived IS NOT TRUE
       AND q.active IS TRUE
     ORDER BY q.id ASC`,
    [locale],
    null,
  );
  return (res.rows ?? []).map((row) => ({
    id: Number(row.id),
    categoryId: Number(row.categoryId),
    label: String(row.label),
  }));
}

/**
 * Resolve labels for known question ids (any active/archived state for display).
 *
 * @param {Array<string|number>} ids
 * @param {string} [lang]
 * @returns {Promise<SecurityQuestion[]>}
 */
export async function getSecurityQuestionsByIds(ids, lang = "en") {
  const unique = [
    ...new Set(
      ids
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  if (unique.length === 0) return [];

  const locale = normalizeLang(lang);
  const res = await execute(
    `SELECT q.id,
            COALESCE(t.trans, te.trans, q.question) AS label
     FROM security_question q
     LEFT JOIN security_question_trans t
       ON t."questionId" = q.id AND t.lang = $1
     LEFT JOIN security_question_trans te
       ON te."questionId" = q.id AND te.lang = 'en'
     WHERE q.id = ANY($2::int[])
     ORDER BY array_position($2::int[], q.id)`,
    [locale, unique],
    null,
  );
  return (res.rows ?? []).map((row) => ({
    id: Number(row.id),
    label: String(row.label),
  }));
}

/**
 * Questions the user has enrolled answers for (challenge UI).
 *
 * @param {number} userId
 * @param {string} [lang]
 * @returns {Promise<SecurityQuestion[]>}
 */
export async function listEnrolledSecurityQuestions(userId, lang = "en") {
  const locale = normalizeLang(lang);
  const res = await execute(
    `SELECT q.id,
            COALESCE(t.trans, te.trans, q.question) AS label
     FROM user_security_answer a
     JOIN security_question q ON q.id = a."questionId"
     LEFT JOIN security_question_trans t
       ON t."questionId" = q.id AND t.lang = $1
     LEFT JOIN security_question_trans te
       ON te."questionId" = q.id AND te.lang = 'en'
     WHERE a."userId" = $2
       AND a.archived IS NOT TRUE
     ORDER BY a.id ASC`,
    [locale, userId],
    null,
  );
  return (res.rows ?? []).map((row) => ({
    id: Number(row.id),
    label: String(row.label),
  }));
}

/**
 * @param {number} [count]
 * @returns {{ slot: number }[]}
 */
export function emptyQuestionSlots(count = 3) {
  return Array.from({ length: count }, (_, i) => ({ slot: i + 1 }));
}

/**
 * @param {string} answer
 * @returns {Promise<string>}
 */
export async function hashSecurityAnswer(answer) {
  const normalized = String(answer || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return encrypt(normalized, tokenSecret());
}

/**
 * Replace the user's enrolled answers (archives previous rows).
 *
 * @param {number} userId
 * @param {Array<{ questionId: number, answer: string }>} pairs
 * @returns {Promise<void>}
 */
export async function saveSecurityAnswers(userId, pairs) {
  await execute(
    `UPDATE user_security_answer
     SET archived = TRUE, "archivedAt" = NOW(),
         "updatedAt" = NOW(), "updaterId" = -1, "updaterName" = 'system'
     WHERE "userId" = $1 AND archived IS NOT TRUE`,
    [userId],
    null,
  );

  for (const pair of pairs) {
    const answerHash = await hashSecurityAnswer(pair.answer);
    await execute(
      `INSERT INTO user_security_answer
         ("userId", "questionId", "answerHash", "creatorId", "creatorName")
       VALUES ($1, $2, $3, -1, 'system')
       ON CONFLICT ("userId", "questionId") DO UPDATE
         SET "answerHash" = EXCLUDED."answerHash",
             archived = FALSE,
             "archivedAt" = NULL,
             "updatedAt" = NOW(),
             "updaterId" = -1,
             "updaterName" = 'system'`,
      [userId, pair.questionId, answerHash],
      null,
    );
  }
  log.info(`security answers saved userId=${userId} count=${pairs.length}`);
}

/**
 * @param {number} userId
 * @param {Array<{ questionId: number, answer: string }>} pairs
 * @returns {Promise<boolean>}
 */
export async function verifySecurityAnswers(userId, pairs) {
  if (!pairs.length) return false;
  const ids = pairs.map((p) => p.questionId);
  const res = await execute(
    `SELECT "questionId", "answerHash"
     FROM user_security_answer
     WHERE "userId" = $1
       AND "questionId" = ANY($2::int[])
       AND archived IS NOT TRUE`,
    [userId, ids],
    null,
  );
  const byId = new Map(
    (res.rows ?? []).map((r) => [Number(r.questionId), String(r.answerHash)]),
  );
  if (byId.size !== pairs.length) return false;

  for (const pair of pairs) {
    const stored = byId.get(pair.questionId);
    if (!stored) return false;
    const normalized = String(pair.answer || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    const ok = await compare(normalized, stored, tokenSecret());
    if (!ok) return false;
  }
  return true;
}
