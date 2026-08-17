// @ts-check
import { buildViewContext } from "../context.js";
import { isSuspiciousForm } from "../form-guards.js";

/**
 * Forced password change when pwd.pwdExpiry has passed.
 * Driven by a short-lived login challenge, not a public email token.
 */

/** @type {import('express').RequestHandler} */
export function getPasswordExpired(req, res) {
  const challenge = String(req.query?.challenge ?? "").trim();
  if (!challenge) {
    return res.status(400).render(
      "password/expired",
      buildViewContext(req, "passwordExpired", {
        form: { challenge: "" },
        error: buildViewContext(req, "passwordExpired").page.errorInvalidToken,
      }),
    );
  }

  res.render(
    "password/expired",
    buildViewContext(req, "passwordExpired", { form: { challenge } }),
  );
}

/** @type {import('express').RequestHandler} */
export function postPasswordExpired(req, res) {
  const page = "passwordExpired";
  const ctxPage = buildViewContext(req, page).page;
  const challenge = String(req.body?.challenge ?? "").trim();
  const password = String(req.body?.password ?? "");
  const confirm = String(req.body?.confirm ?? "");

  if (isSuspiciousForm(req) || !challenge) {
    return res.status(400).render(
      "password/expired",
      buildViewContext(req, page, {
        form: { challenge },
        error: ctxPage.errorInvalidToken,
      }),
    );
  }

  if (password !== confirm) {
    return res.status(400).render(
      "password/expired",
      buildViewContext(req, page, {
        form: { challenge },
        error: ctxPage.errorMismatch,
      }),
    );
  }

  if (password.length < 8) {
    return res.status(400).render(
      "password/expired",
      buildViewContext(req, page, {
        form: { challenge },
        error: ctxPage.errorWeak,
      }),
    );
  }

  // TODO: validate against active pwd_policy, rotate hash, clear/extend pwdExpiry.
  return res.render(
    "password/expired-done",
    buildViewContext(req, "passwordExpiredDone"),
  );
}
