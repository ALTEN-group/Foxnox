// @ts-check
import { buildViewContext, resolveLang } from "../context.js";
import { isSuspiciousForm, isValidEmail } from "../form-guards.js";
import { issueWorkflowNotification } from "../issue-notification.js";
import { SECURITY_QUESTION_CATALOG } from "../security-questions.js";
import {
  bumpWorkflowTokenAttempts,
  consumeWorkflowToken,
  findValidWorkflowToken,
  TOKEN_TYPES,
} from "../../services/token.js";

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

  // TODO: load the user's enrolled questions for valid.userId.
  const questions = SECURITY_QUESTION_CATALOG.slice(0, 2).map((q) => ({
    id: q.id,
    label: q.label,
  }));

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
  const answers = [].concat(req.body?.answers ?? []).map((a) => String(a).trim());

  if (
    questionIds.length === 0 ||
    answers.length !== questionIds.length ||
    answers.some((a) => !a)
  ) {
    await bumpWorkflowTokenAttempts(valid.id);
    const questions = questionIds.map((id, index) => {
      const catalog = SECURITY_QUESTION_CATALOG.find(
        (q) => String(q.id) === String(id),
      );
      return {
        id,
        label: catalog?.label ?? `Question ${index + 1}`,
      };
    });
    return res.status(400).render(
      "account-recover/challenge",
      buildViewContext(req, page, {
        form: { token, questions },
        error: ctxPage.errorInvalid,
      }),
    );
  }

  // TODO: verify answer hashes for valid.userId, then clear twoFactorSecret.
  await consumeWorkflowToken(valid.id);

  return res.render(
    "account-recover/done",
    buildViewContext(req, "accountRecoverDone"),
  );
}
