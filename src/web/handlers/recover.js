// @ts-check
import { buildViewContext } from "../context.js";
import { isSuspiciousForm, isValidEmail } from "../form-guards.js";

/**
 * Password recovery workflow pages.
 *
 * Backend token/email/password-update logic is intentionally stubbed for now:
 * the UI flow and route surface are real; wire passken + token rows next.
 */

/** @type {import('express').RequestHandler} */
export function getRecoverRequest(req, res) {
  res.render("recover/request", buildViewContext(req, "recoverRequest"));
}

/** @type {import('express').RequestHandler} */
export function postRecoverRequest(req, res) {
  const ctx = buildViewContext(req, "recoverRequest");

  if (isSuspiciousForm(req)) {
    // Silent drop — same posture as the marketing contact form.
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

  // TODO: look up user, create Password-reset token, send email.
  // Always show the same success page to avoid account enumeration.
  return res.render("recover/sent", buildViewContext(req, "recoverSent"));
}

/** @type {import('express').RequestHandler} */
export function getRecoverReset(req, res) {
  const token = String(req.query?.token ?? "").trim();
  if (!token) {
    return res.status(400).render(
      "recover/invalid",
      buildViewContext(req, "recoverInvalid"),
    );
  }

  // TODO: validate token against token table (type = Password reset, not expired).
  return res.render(
    "recover/reset",
    buildViewContext(req, "recoverReset", { form: { token } }),
  );
}

/** @type {import('express').RequestHandler} */
export function postRecoverReset(req, res) {
  const page = "recoverReset";
  const ctxPage = buildViewContext(req, page).page;
  const token = String(req.body?.token ?? "").trim();
  const password = String(req.body?.password ?? "");
  const confirm = String(req.body?.confirm ?? "");

  if (isSuspiciousForm(req) || !token) {
    return res.status(400).render(
      "recover/invalid",
      buildViewContext(req, "recoverInvalid"),
    );
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

  // TODO: consume token, hash+store password via passken-express, archive token.
  return res.render("recover/done", buildViewContext(req, "recoverDone"));
}
