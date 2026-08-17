// @ts-check
import { buildViewContext, resolveLang } from "../context.js";
import { isSuspiciousForm, isValidEmail } from "../form-guards.js";
import { issueWorkflowNotification } from "../issue-notification.js";
import {
  consumeWorkflowToken,
  findValidWorkflowToken,
  TOKEN_TYPES,
} from "../../services/token.js";

/**
 * Account unlock after pwd.failedAttempts / lockedUntil lockout.
 */

/** @type {import('express').RequestHandler} */
export function getUnlockRequest(req, res) {
  res.render("unlock/request", buildViewContext(req, "unlockRequest"));
}

/** @type {import('express').RequestHandler} */
export async function postUnlockRequest(req, res) {
  const ctx = buildViewContext(req, "unlockRequest");

  if (isSuspiciousForm(req)) return res.status(204).end();

  const email = String(req.body?.email ?? "").trim();
  if (!isValidEmail(email)) {
    return res.status(400).render("unlock/request", {
      ...ctx,
      form: { email },
      error: ctx.page.errorInvalidEmail,
    });
  }

  await issueWorkflowNotification({
    email,
    typeName: TOKEN_TYPES.ACCOUNT_UNLOCK,
    path: "/unlock/confirm",
    template: "account-unlock",
    lang: resolveLang(req),
  });

  return res.render("unlock/sent", buildViewContext(req, "unlockSent"));
}

/** @type {import('express').RequestHandler} */
export async function getUnlockConfirm(req, res) {
  const token = String(req.query?.token ?? "").trim();
  if (!token) {
    return res
      .status(400)
      .render("unlock/invalid", buildViewContext(req, "unlockInvalid"));
  }

  const valid = await findValidWorkflowToken({
    plaintext: token,
    typeName: TOKEN_TYPES.ACCOUNT_UNLOCK,
  });
  if (!valid) {
    return res
      .status(400)
      .render("unlock/invalid", buildViewContext(req, "unlockInvalid"));
  }

  // TODO: clear failedAttempts / lockedUntil for valid.userId.
  await consumeWorkflowToken(valid.id);

  return res.render("unlock/done", buildViewContext(req, "unlockDone"));
}
