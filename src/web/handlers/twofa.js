// @ts-check
import { buildViewContext } from "../context.js";
import { isSuspiciousForm } from "../form-guards.js";

/**
 * Two-factor authentication workflow pages.
 *
 * Setup/verify crypto is stubbed until TOTP helpers land; the page flow is ready.
 */

/** @type {import('express').RequestHandler} */
export function getTwofaVerify(req, res) {
  const challenge = String(req.query?.challenge ?? "").trim();
  res.render(
    "twofa/verify",
    buildViewContext(req, "twofaVerify", { form: { challenge } }),
  );
}

/** @type {import('express').RequestHandler} */
export function postTwofaVerify(req, res) {
  const page = "twofaVerify";
  const ctxPage = buildViewContext(req, page).page;
  const challenge = String(req.body?.challenge ?? "").trim();
  const code = String(req.body?.code ?? "").trim();

  if (isSuspiciousForm(req)) {
    return res.status(204).end();
  }

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).render(
      "twofa/verify",
      buildViewContext(req, page, {
        form: { challenge },
        error: ctxPage.errorInvalid,
      }),
    );
  }

  // TODO: verify TOTP against pwd.twoFactorSecret for the pending challenge.
  return res.render("twofa/done", buildViewContext(req, "twofaDone"));
}

/** @type {import('express').RequestHandler} */
export function getTwofaSetup(req, res) {
  // Placeholder secret until setup endpoint generates a real TOTP secret.
  const secret = String(req.query?.secret ?? "SETUP-PENDING");
  const setupToken = String(req.query?.setupToken ?? "").trim();

  res.render(
    "twofa/setup",
    buildViewContext(req, "twofaSetup", {
      form: { secret, setupToken },
    }),
  );
}

/** @type {import('express').RequestHandler} */
export function postTwofaSetup(req, res) {
  const page = "twofaSetup";
  const ctxPage = buildViewContext(req, page).page;
  const setupToken = String(req.body?.setupToken ?? "").trim();
  const code = String(req.body?.code ?? "").trim();

  if (isSuspiciousForm(req)) {
    return res.status(204).end();
  }

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).render(
      "twofa/setup",
      buildViewContext(req, page, {
        form: { setupToken, secret: "SETUP-PENDING" },
        error: ctxPage.errorInvalid,
      }),
    );
  }

  // TODO: confirm code, persist twoFactorSecret, set twoFactorEnabled = true.
  return res.render("twofa/done", buildViewContext(req, "twofaDone"));
}
