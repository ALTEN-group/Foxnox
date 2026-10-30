// @ts-check
import { execute } from "@dwtechs/antity-pgsql";
import { isArray, isValidInteger } from "@dwtechs/checkard";
import { compare, encrypt } from "@dwtechs/hashitaka";
import { log } from "@dwtechs/winstan";
import esaEnt from "../entities/enrolled-security-answer.js";
import sqEnt from "../entities/security-question.js";
import { tokenSecret } from "./token-crypto.js";

/**
 * Serves the public web workflows only — the setup page
 * (src/web/handlers/security-questions.js) and the account recovery challenge
 * (src/web/handlers/account-recover.js). Each export below says which one.
 *
 * The admin never calls this service: it manages the catalog through the
 * generic entity CRUD (src/entities/security-question.js wired in
 * src/routes/security-question.js).
 *
 * Every read goes through an entity: the catalog through security_question,
 * the enrolled answers through the enrolled_security_answer view (answer joined
 * to its question). Only the writes in saveSecurityAnswers stay raw SQL: a bulk
 * archive and an upsert, which an entity cannot express.
 */

/**
 * @typedef {{ id: number, label: string, categoryId?: number }} SecurityQuestion
 */

/**
 * @param {string} [lang]
 * @returns {"en"|"fr"}
 */
function normalizeLang(lang) {
  return String(lang || "en")
    .toLowerCase()
    .startsWith("fr")
    ? "fr"
    : "en";
}

/**
 * Localized label of a question row (fallback: en, then the internal key).
 *
 * @param {{ question: string, trans?: Record<string, string> | null }} row
 * @param {"en"|"fr"} locale
 * @returns {string}
 */
function localizedLabel(row, locale) {
  const trans = row.trans ?? {};
  return String(trans[locale] || trans.en || row.question);
}

/**
 * Active, non-archived questions with localized labels (fallback: en, then key).
 * Web setup page: catalog the user picks from.
 *
 * @param {string} [lang]
 * @returns {Promise<SecurityQuestion[]>}
 */
export async function listSecurityQuestionCatalog(lang = "en") {
  const locale = normalizeLang(lang);
  const { query, args } = sqEnt.query.select(
    0,
    null,
    "id",
    "ASC",
    {
      active: { value: true, matchMode: "equals" },
      archived: { value: false, matchMode: "equals" },
    },
    "AND",
  );
  const res = await execute(query, args, null);
  return (res.rows ?? []).map((row) => ({
    id: Number(row.id),
    categoryId: Number(row.categoryId),
    label: localizedLabel(row, locale),
  }));
}

/**
 * Resolve labels for known question ids (any active/archived state for display).
 * Web recovery challenge: labels of the questions being asked.
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
  const { query, args } = sqEnt.query.select(
    0,
    null,
    null,
    null,
    { id: { value: unique, matchMode: "in" } },
    "AND",
  );
  const res = await execute(query, args, null);
  const byId = new Map((res.rows ?? []).map((row) => [Number(row.id), row]));
  return unique.flatMap((id) => {
    const row = byId.get(id);
    return row ? [{ id, label: localizedLabel(row, locale) }] : [];
  });
}

/**
 * Non-archived answers the user has enrolled, oldest first.
 *
 * @param {number} userId
 * @param {number|null} [limit]
 * @returns {Promise<object[]>}
 */
async function selectEnrolled(userId, limit = null) {
  const { query, args } = esaEnt.query.select(0, limit, "id", "ASC", {
    userId: { value: userId, matchMode: "equals" },
  });
  const res = await execute(query, args, null);
  return res.rows ?? [];
}

/**
 * Questions the user has enrolled answers for (challenge UI).
 * Web recovery challenge: questions to ask.
 *
 * @param {number} userId
 * @param {string} [lang]
 * @returns {Promise<SecurityQuestion[]>}
 */
export async function listEnrolledSecurityQuestions(userId, lang = "en") {
  const locale = normalizeLang(lang);
  const rows = await selectEnrolled(userId);
  return rows.map((row) => ({
    id: Number(row.questionId),
    label: localizedLabel(row, locale),
  }));
}

/**
 * Web setup page: tells whether the user is replacing an existing set.
 *
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export async function hasEnrolledSecurityAnswers(userId) {
  return (await selectEnrolled(userId, 1)).length > 0;
}

/**
 * Web setup page: empty rows of the enrollment form.
 *
 * @param {number} [count]
 * @returns {{ slot: number }[]}
 */
export function emptyQuestionSlots(count = 3) {
  return Array.from({ length: count }, (_, i) => ({ slot: i + 1 }));
}

/**
 * Used by the save and verify helpers below; exported for the tests.
 *
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
 * Web setup page: form submission.
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
 * True only when `pairs` is exactly the user's enrolled set and every answer
 * matches. A subset (even with correct answers) must not succeed.
 * Web recovery challenge: answer verification.
 *
 * @param {number} userId
 * @param {Array<{ questionId: number, answer: string }>} pairs
 * @returns {Promise<boolean>}
 */
export async function verifySecurityAnswers(userId, pairs) {
  if (!isArray(pairs, ">", 0)) return false;

  const submittedIds = pairs.map((p) => Number(p.questionId));
  if (
    submittedIds.some((id) => !isValidInteger(id, 1, undefined, true)) ||
    new Set(submittedIds).size !== submittedIds.length
  )
    return false;

  const rows = await selectEnrolled(userId);
  const byId = new Map(
    rows.map((r) => [Number(r.questionId), String(r.answerHash)]),
  );
  if (byId.size === 0 || byId.size !== submittedIds.length) return false;
  for (const id of submittedIds) {
    if (!byId.has(id)) return false;
  }

  for (const pair of pairs) {
    const stored = byId.get(Number(pair.questionId));
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
