// @ts-check
import { buildViewContext } from "../context.js";
import { isSuspiciousForm, isValidEmail } from "../form-guards.js";

/**
 * Account unlock after pwd.failedAttempts / lockedUntil lockout.
 */

/** @type {import('express').RequestHandler} */
export function getUnlockRequest(req, res) {
  res.render("unlock/request", buildViewContext(req, "unlockRequest"));
}

/** @type {import('express').RequestHandler} */
export function postUnlockRequest(req, res) {
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

  // TODO: if locked, issue unlock token / clear lock on timer — no enumeration.
  return res.render("unlock/sent", buildViewContext(req, "unlockSent"));
}

/** @type {import('express').RequestHandler} */
export function getUnlockConfirm(req, res) {
  const token = String(req.query?.token ?? "").trim();
  if (!token) {
    return res
      .status(400)
      .render("unlock/invalid", buildViewContext(req, "unlockInvalid"));
  }

  // TODO: consume unlock token, reset failedAttempts / lockedUntil.
  return res.render("unlock/done", buildViewContext(req, "unlockDone"));
}
