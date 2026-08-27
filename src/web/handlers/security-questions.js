// @ts-check

import {
  emptyQuestionSlots,
  listSecurityQuestionCatalog,
  saveSecurityAnswers,
} from "../../services/security-questions.js";
import { getConsumerUserId } from "../consumer.js";
import { buildViewContext, resolveLang } from "../context.js";
import { isSuspiciousForm } from "../form-guards.js";

/**
 * Enroll security questions for later account-recovery challenges.
 * Requires Gatelin session (`x-consumer-user-id`).
 */

/** @type {import('express').RequestHandler} */
export async function getSecurityQuestionsSetup(req, res) {
  const userId = getConsumerUserId(req);
  if (!userId) {
    return res.status(401).render(
      "security-questions/setup",
      buildViewContext(req, "securityQuestionsSetup", {
        form: { slots: emptyQuestionSlots(3), catalog: [] },
        error: buildViewContext(req, "securityQuestionsSetup").page
          .errorIncomplete,
      }),
    );
  }

  const lang = resolveLang(req);
  const catalog = await listSecurityQuestionCatalog(lang);
  res.render(
    "security-questions/setup",
    buildViewContext(req, "securityQuestionsSetup", {
      form: {
        slots: emptyQuestionSlots(3),
        catalog,
      },
    }),
  );
}

/** @type {import('express').RequestHandler} */
export async function postSecurityQuestionsSetup(req, res) {
  const page = "securityQuestionsSetup";
  const ctxPage = buildViewContext(req, page).page;
  const lang = resolveLang(req);
  const catalog = await listSecurityQuestionCatalog(lang);
  const userId = getConsumerUserId(req);

  if (isSuspiciousForm(req)) return res.status(204).end();

  if (!userId) {
    return res.status(401).render(
      "security-questions/setup",
      buildViewContext(req, page, {
        form: { slots: emptyQuestionSlots(3), catalog },
        error: ctxPage.errorIncomplete,
      }),
    );
  }

  const questionIds = [].concat(req.body?.questionIds ?? []);
  const answers = []
    .concat(req.body?.answers ?? [])
    .map((a) => String(a).trim());
  const uniqueIds = new Set(questionIds.filter(Boolean).map(String));
  const allowed = new Set(catalog.map((q) => String(q.id)));
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
        form: {
          slots: emptyQuestionSlots(3),
          catalog,
        },
        error: ctxPage.errorIncomplete,
      }),
    );
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
        form: { slots: emptyQuestionSlots(3), catalog },
        error: ctxPage.errorIncomplete,
      }),
    );
  }

  return res.render(
    "security-questions/done",
    buildViewContext(req, "securityQuestionsDone"),
  );
}
