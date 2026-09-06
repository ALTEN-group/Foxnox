// @ts-check

import { verifyCurrentPassword } from "../../services/pwd.js";
import {
  emptyQuestionSlots,
  hasEnrolledSecurityAnswers,
  listSecurityQuestionCatalog,
  saveSecurityAnswers,
} from "../../services/security-questions.js";
import { getConsumerUserId } from "../consumer.js";
import { buildViewContext, resolveLang } from "../context.js";
import { isSuspiciousForm } from "../form-guards.js";

/**
 * Enroll security questions for later account-recovery challenges.
 * Requires Gatelin session (`x-consumer-user-id`). Replacing an existing set
 * also requires the current password.
 */

/**
 * @param {number|null} userId
 * @param {string} [lang]
 */
async function setupForm(userId, lang = "en") {
  const catalog = userId ? await listSecurityQuestionCatalog(lang) : [];
  const replacing = userId ? await hasEnrolledSecurityAnswers(userId) : false;
  return {
    slots: emptyQuestionSlots(3),
    catalog,
    replacing,
  };
}

/** @type {import('express').RequestHandler} */
export async function getSecurityQuestionsSetup(req, res) {
  const userId = getConsumerUserId(req);
  if (!userId) {
    return res.status(401).render(
      "security-questions/setup",
      buildViewContext(req, "securityQuestionsSetup", {
        form: await setupForm(null),
        error: buildViewContext(req, "securityQuestionsSetup").page
          .errorIncomplete,
      }),
    );
  }

  res.render(
    "security-questions/setup",
    buildViewContext(req, "securityQuestionsSetup", {
      form: await setupForm(userId, resolveLang(req)),
    }),
  );
}

/** @type {import('express').RequestHandler} */
export async function postSecurityQuestionsSetup(req, res) {
  const page = "securityQuestionsSetup";
  const ctxPage = buildViewContext(req, page).page;
  const lang = resolveLang(req);
  const userId = getConsumerUserId(req);

  if (isSuspiciousForm(req)) return res.status(204).end();

  if (!userId) {
    return res.status(401).render(
      "security-questions/setup",
      buildViewContext(req, page, {
        form: await setupForm(null, lang),
        error: ctxPage.errorIncomplete,
      }),
    );
  }

  const form = await setupForm(userId, lang);
  const questionIds = [].concat(req.body?.questionIds ?? []);
  const answers = []
    .concat(req.body?.answers ?? [])
    .map((a) => String(a).trim());
  const uniqueIds = new Set(questionIds.filter(Boolean).map(String));
  const allowed = new Set(form.catalog.map((q) => String(q.id)));
  const allKnown = questionIds.every((id) => allowed.has(String(id)));

  if (
    questionIds.length < 3 ||
    answers.length !== questionIds.length ||
    answers.some((a) => !a) ||
    uniqueIds.size !== questionIds.length ||
    !allKnown
  ) {
    return res.status(400).render(
      "security-questions/setup",
      buildViewContext(req, page, {
        form,
        error: ctxPage.errorIncomplete,
      }),
    );
  }

  if (form.replacing) {
    const password = String(req.body?.password ?? "");
    if (!password || !(await verifyCurrentPassword(userId, password))) {
      return res.status(400).render(
        "security-questions/setup",
        buildViewContext(req, page, {
          form,
          error: ctxPage.errorPassword,
        }),
      );
    }
  }

  try {
    await saveSecurityAnswers(
      userId,
      questionIds.map((id, i) => ({
        questionId: Number(id),
        answer: answers[i],
      })),
    );
  } catch {
    return res.status(500).render(
      "security-questions/setup",
      buildViewContext(req, page, {
        form,
        error: ctxPage.errorGeneric,
      }),
    );
  }

  return res.render(
    "security-questions/done",
    buildViewContext(req, "securityQuestionsDone"),
  );
}
