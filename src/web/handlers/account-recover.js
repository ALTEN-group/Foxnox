// @ts-check

import { disableTwoFactor } from "../../services/pwd.js";
import {
  getSecurityQuestionsByIds,
  listEnrolledSecurityQuestions,
  verifySecurityAnswers,
} from "../../services/security-questions.js";
import {
  bumpWorkflowTokenAttempts,
  consumeWorkflowToken,
  findValidWorkflowToken,
  TOKEN_TYPES,
} from "../../services/token.js";
import { buildViewContext, resolveLang } from "../context.js";
import { isSuspiciousForm, isValidEmail } from "../form-guards.js";
import { issueWorkflowNotification } from "../issue-notification.js";

/**
 * Lost-2FA / account recovery using the Account recovery token type
 * plus enrolled security questions.
 */

/** @type {import('express').RequestHandler} */
export function getAccountRecoverRequest(req, res) {
  res.render(
    "account-recover/request",
    buildViewContext(req, "accountRecoverRequest"),
  );
}

/** @type {import('express').RequestHandler} */
export async function postAccountRecoverRequest(req, res) {
  const ctx = buildViewContext(req, "accountRecoverRequest");

  if (isSuspiciousForm(req)) return res.status(204).end();

  const email = String(req.body?.email ?? "").trim();
  if (!isValidEmail(email)) {
    return res.status(400).render("account-recover/request", {
      ...ctx,
      form: { email },
      error: ctx.page.errorInvalidEmail,
    });
  }

  await issueWorkflowNotification({
    email,
    typeName: TOKEN_TYPES.ACCOUNT_RECOVERY,
    path: "/account-recover/challenge",
    template: "account-recover",
    lang: resolveLang(req),
  });

  return res.render(
    "account-recover/sent",
    buildViewContext(req, "accountRecoverSent"),
  );
}

/** @type {import('express').RequestHandler} */
export async function getAccountRecoverChallenge(req, res) {
  const token = String(req.query?.token ?? "").trim();
  const lang = resolveLang(req);
  if (!token) {
    return res
      .status(400)
      .render("recover/invalid", buildViewContext(req, "recoverInvalid"));
  }

  const valid = await findValidWorkflowToken({
    plaintext: token,
    typeName: TOKEN_TYPES.ACCOUNT_RECOVERY,
  });
  if (!valid) {
    return res
      .status(400)
      .render("recover/invalid", buildViewContext(req, "recoverInvalid"));
  }

  const questions = await listEnrolledSecurityQuestions(valid.userId, lang);
  if (questions.length === 0) {
    return res
      .status(400)
      .render("recover/invalid", buildViewContext(req, "recoverInvalid"));
  }

  return res.render(
    "account-recover/challenge",
    buildViewContext(req, "accountRecoverChallenge", {
      form: { token, questions },
    }),
  );
}

/** @type {import('express').RequestHandler} */
export async function postAccountRecoverChallenge(req, res) {
  const page = "accountRecoverChallenge";
  const ctxPage = buildViewContext(req, page).page;
  const token = String(req.body?.token ?? "").trim();
  const lang = resolveLang(req);

  if (isSuspiciousForm(req) || !token) {
    return res
      .status(400)
      .render("recover/invalid", buildViewContext(req, "recoverInvalid"));
  }

  const valid = await findValidWorkflowToken({
    plaintext: token,
    typeName: TOKEN_TYPES.ACCOUNT_RECOVERY,
  });
  if (!valid) {
    return res
      .status(400)
      .render("recover/invalid", buildViewContext(req, "recoverInvalid"));
  }

  const questionIds = [].concat(req.body?.questionIds ?? []);
  const answers = []
    .concat(req.body?.answers ?? [])
    .map((a) => String(a).trim());

  const pairs = questionIds.map((id, i) => ({
    questionId: Number(id),
    answer: answers[i] ?? "",
  }));

  const incomplete =
    pairs.length === 0 ||
    pairs.some(
      (p) => !Number.isInteger(p.questionId) || p.questionId < 1 || !p.answer,
    );

  let matched = false;
  if (!incomplete) {
    matched = await verifySecurityAnswers(valid.userId, pairs);
  }

  if (incomplete || !matched) {
    await bumpWorkflowTokenAttempts(valid.id);
    const questions = await getSecurityQuestionsByIds(
      pairs.map((p) => p.questionId),
      lang,
    );
    return res.status(400).render(
      "account-recover/challenge",
      buildViewContext(req, page, {
        form: {
          token,
          questions:
            questions.length > 0
              ? questions
              : await listEnrolledSecurityQuestions(valid.userId, lang),
        },
        error: ctxPage.errorInvalid,
      }),
    );
  }

  try {
    await disableTwoFactor(valid.userId);
    await consumeWorkflowToken(valid.id);
  } catch {
    return res
      .status(500)
      .render("recover/invalid", buildViewContext(req, "recoverInvalid"));
  }

  return res.render(
    "account-recover/done",
    buildViewContext(req, "accountRecoverDone"),
  );
}
