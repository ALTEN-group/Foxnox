// @ts-check
import { buildViewContext } from "../context.js";
import { isSuspiciousForm } from "../form-guards.js";
import {
  emptyQuestionSlots,
  SECURITY_QUESTION_CATALOG,
} from "../security-questions.js";

/**
 * Enroll security questions for later account-recovery challenges.
 * Authenticated in production; stubbed open for UI scaffolding.
 */

/** @type {import('express').RequestHandler} */
export function getSecurityQuestionsSetup(req, res) {
  res.render(
    "security-questions/setup",
    buildViewContext(req, "securityQuestionsSetup", {
      form: {
        slots: emptyQuestionSlots(3),
        catalog: SECURITY_QUESTION_CATALOG,
      },
    }),
  );
}

/** @type {import('express').RequestHandler} */
export function postSecurityQuestionsSetup(req, res) {
  const page = "securityQuestionsSetup";
  const ctxPage = buildViewContext(req, page).page;

  if (isSuspiciousForm(req)) return res.status(204).end();

  const questionIds = [].concat(req.body?.questionIds ?? []);
  const answers = [].concat(req.body?.answers ?? []).map((a) => String(a).trim());
  const uniqueIds = new Set(questionIds.filter(Boolean).map(String));

  if (
    questionIds.length < 3 ||
    answers.length !== questionIds.length ||
    answers.some((a) => !a) ||
    uniqueIds.size !== questionIds.length
  ) {
    return res.status(400).render(
      "security-questions/setup",
      buildViewContext(req, page, {
        form: {
          slots: emptyQuestionSlots(3),
          catalog: SECURITY_QUESTION_CATALOG,
        },
        error: ctxPage.errorIncomplete,
      }),
    );
  }

  // TODO: hash answers into user_security_answer rows for the authenticated user.
  return res.render(
    "security-questions/done",
    buildViewContext(req, "securityQuestionsDone"),
  );
}
