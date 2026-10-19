// @ts-check

import {
  consumeLoginChallenge,
  createLoginChallenge,
  findValidLoginChallenge,
} from "../../services/challenge.js";
import {
  getPasswordFormPolicy,
  getPwdAuthState,
  getPwdPolicyForUser,
  passwordMeetsPolicy,
  rotatePassword,
} from "../../services/pwd.js";
import { buildViewContext } from "../context.js";
import { isSuspiciousForm } from "../form-guards.js";
import { buildLoginResumeUrl } from "../login-resume.js";

/**
 * Forced password change when pwd.pwdExpiry has passed.
 */

/** @type {import('express').RequestHandler} */
export async function getPasswordExpired(req, res) {
  const challenge = String(req.query?.challenge ?? "").trim();
  const policy = await getPasswordFormPolicy();
  if (!challenge) {
    return res.status(400).render(
      "password/expired",
      buildViewContext(req, "passwordExpired", {
        form: { challenge: "" },
        policy,
        error: buildViewContext(req, "passwordExpired").page.errorInvalidToken,
      }),
    );
  }

  const valid = await findValidLoginChallenge({
    plaintext: challenge,
    kind: "expired-password",
  });
  if (!valid) {
    return res.status(400).render(
      "password/expired",
      buildViewContext(req, "passwordExpired", {
        form: { challenge: "" },
        policy,
        error: buildViewContext(req, "passwordExpired").page.errorInvalidToken,
      }),
    );
  }

  res.render(
    "password/expired",
    buildViewContext(req, "passwordExpired", {
      form: { challenge },
      policy: await getPasswordFormPolicy(valid.userId),
    }),
  );
}

/** @type {import('express').RequestHandler} */
export async function postPasswordExpired(req, res) {
  const page = "passwordExpired";
  const ctxPage = buildViewContext(req, page).page;
  const challenge = String(req.body?.challenge ?? "").trim();
  const password = String(req.body?.password ?? "");
  const confirm = String(req.body?.confirm ?? "");
  let policy = await getPasswordFormPolicy();

  if (isSuspiciousForm(req) || !challenge) {
    return res.status(400).render(
      "password/expired",
      buildViewContext(req, page, {
        form: { challenge },
        policy,
        error: ctxPage.errorInvalidToken,
      }),
    );
  }

  const valid = await findValidLoginChallenge({
    plaintext: challenge,
    kind: "expired-password",
  });
  if (!valid) {
    return res.status(400).render(
      "password/expired",
      buildViewContext(req, page, {
        form: { challenge: "" },
        policy,
        error: ctxPage.errorInvalidToken,
      }),
    );
  }

  policy = await getPasswordFormPolicy(valid.userId);

  if (password !== confirm) {
    return res.status(400).render(
      "password/expired",
      buildViewContext(req, page, {
        form: { challenge },
        policy,
        error: ctxPage.errorMismatch,
      }),
    );
  }

  const userPolicy = await getPwdPolicyForUser(valid.userId);
  if (!(await passwordMeetsPolicy(password, userPolicy))) {
    return res.status(400).render(
      "password/expired",
      buildViewContext(req, page, {
        form: { challenge },
        policy,
        error: ctxPage.errorWeak,
      }),
    );
  }

  try {
    await rotatePassword(valid.userId, password);
    await consumeLoginChallenge(valid.id);

    const state = await getPwdAuthState(valid.userId);
    if (state?.twoFactorEnabled) {
      const next = await createLoginChallenge({
        userId: valid.userId,
        kind: "2fa",
      });
      return res.redirect(303, next.url);
    }

    const resumeUrl = await buildLoginResumeUrl(valid.userId);
    return res.redirect(303, resumeUrl);
  } catch (err) {
    // @ts-expect-error
    if (err?.code === "WEAK_PASSWORD") {
      return res.status(400).render(
        "password/expired",
        buildViewContext(req, page, {
          form: { challenge },
          policy,
          error: ctxPage.errorWeak,
        }),
      );
    }
    return res.status(500).render(
      "password/expired",
      buildViewContext(req, page, {
        form: { challenge },
        policy,
        error: ctxPage.errorGeneric,
      }),
    );
  }
}
