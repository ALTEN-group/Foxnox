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
 * Password recovery workflow pages.
 */

/** @type {import('express').RequestHandler} */
export function getRecoverRequest(req, res) {
  res.render("recover/request", buildViewContext(req, "recoverRequest"));
}

/** @type {import('express').RequestHandler} */
export async function postRecoverRequest(req, res) {
  const ctx = buildViewContext(req, "recoverRequest");

  if (isSuspiciousForm(req)) {
    return res.status(204).end();
  }

  const email = String(req.body?.email ?? "").trim();
  if (!isValidEmail(email)) {
    return res.status(400).render("recover/request", {
      ...ctx,
      form: { email },
      error: ctx.page.errorInvalidEmail,
    });
  }

  await issueWorkflowNotification({
    email,
    typeName: TOKEN_TYPES.PASSWORD_RESET,
    path: "/recover/reset",
    template: "pwd-reset",
    lang: resolveLang(req),
  });

  // Always the same page — no account enumeration.
  return res.render("recover/sent", buildViewContext(req, "recoverSent"));
}

/** @type {import('express').RequestHandler} */
export async function getRecoverReset(req, res) {
  const token = String(req.query?.token ?? "").trim();
  if (!token) {
    return res
      .status(400)
      .render("recover/invalid", buildViewContext(req, "recoverInvalid"));
  }

  const valid = await findValidWorkflowToken({
    plaintext: token,
    typeName: TOKEN_TYPES.PASSWORD_RESET,
  });
  if (!valid) {
    return res
      .status(400)
      .render("recover/invalid", buildViewContext(req, "recoverInvalid"));
  }

  return res.render(
    "recover/reset",
    buildViewContext(req, "recoverReset", { form: { token } }),
  );
}

/** @type {import('express').RequestHandler} */
export async function postRecoverReset(req, res) {
  const page = "recoverReset";
  const ctxPage = buildViewContext(req, page).page;
  const token = String(req.body?.token ?? "").trim();
  const password = String(req.body?.password ?? "");
  const confirm = String(req.body?.confirm ?? "");

  if (isSuspiciousForm(req) || !token) {
    return res
      .status(400)
      .render("recover/invalid", buildViewContext(req, "recoverInvalid"));
  }

  const valid = await findValidWorkflowToken({
    plaintext: token,
    typeName: TOKEN_TYPES.PASSWORD_RESET,
  });
  if (!valid) {
    return res
      .status(400)
      .render("recover/invalid", buildViewContext(req, "recoverInvalid"));
  }

  if (password !== confirm) {
    return res.status(400).render(
      "recover/reset",
      buildViewContext(req, page, {
        form: { token },
        error: ctxPage.errorMismatch,
      }),
    );
  }

  if (password.length < 8) {
    return res.status(400).render(
      "recover/reset",
      buildViewContext(req, page, {
        form: { token },
        error: ctxPage.errorWeak,
      }),
    );
  }

  // TODO: rotate pwd hash for valid.userId via passken-express / hashitaka.
  await consumeWorkflowToken(valid.id);

  return res.render("recover/done", buildViewContext(req, "recoverDone"));
}
