// @ts-check
import { buildViewContext } from "../context.js";
import { getConsumerUserId } from "../consumer.js";
import { isSuspiciousForm } from "../form-guards.js";
import {
  consumeLoginChallenge,
  createLoginChallenge,
  findValidLoginChallenge,
} from "../../services/challenge.js";
import {
  enableTwoFactor,
  getTwoFactorSecret,
} from "../../services/pwd.js";
import {
  buildOtpauthUri,
  generateTotpSecret,
  verifyTotpCode,
} from "../../services/totp.js";

/**
 * Two-factor authentication workflow pages.
 */

/** @type {import('express').RequestHandler} */
export async function getTwofaVerify(req, res) {
  const challenge = String(req.query?.challenge ?? "").trim();
  if (!challenge) {
    return res
      .status(400)
      .render("twofa/invalid", buildViewContext(req, "twofaInvalid"));
  }

  const valid = await findValidLoginChallenge({
    plaintext: challenge,
    kind: "2fa",
  });
  if (!valid) {
    return res
      .status(400)
      .render("twofa/invalid", buildViewContext(req, "twofaInvalid"));
  }

  res.render(
    "twofa/verify",
    buildViewContext(req, "twofaVerify", { form: { challenge } }),
  );
}

/** @type {import('express').RequestHandler} */
export async function postTwofaVerify(req, res) {
  const page = "twofaVerify";
  const ctxPage = buildViewContext(req, page).page;
  const challenge = String(req.body?.challenge ?? "").trim();
  const code = String(req.body?.code ?? "").trim();

  if (isSuspiciousForm(req)) {
    return res.status(204).end();
  }

  const valid = await findValidLoginChallenge({
    plaintext: challenge,
    kind: "2fa",
  });
  if (!valid) {
    return res
      .status(400)
      .render("twofa/invalid", buildViewContext(req, "twofaInvalid"));
  }

  const secret = await getTwoFactorSecret(valid.userId);
  if (!secret || !verifyTotpCode(secret, code)) {
    return res.status(400).render(
      "twofa/verify",
      buildViewContext(req, page, {
        form: { challenge },
        error: ctxPage.errorInvalid,
      }),
    );
  }

  try {
    await consumeLoginChallenge(valid.id);
    const next = await createLoginChallenge({
      userId: valid.userId,
      kind: "trusted-device",
    });
    return res.redirect(303, next.url);
  } catch {
    return res
      .status(500)
      .render("twofa/invalid", buildViewContext(req, "twofaInvalid"));
  }
}

/** @type {import('express').RequestHandler} */
export function getTwofaSetup(req, res) {
  const userId = getConsumerUserId(req);
  if (!userId) {
    return res
      .status(401)
      .render("twofa/invalid", buildViewContext(req, "twofaInvalid"));
  }

  const secret = generateTotpSecret();
  const otpauthUrl = buildOtpauthUri({
    secret,
    accountName: String(userId),
  });

  res.render(
    "twofa/setup",
    buildViewContext(req, "twofaSetup", {
      form: { secret, otpauthUrl, setupToken: "" },
    }),
  );
}

/** @type {import('express').RequestHandler} */
export async function postTwofaSetup(req, res) {
  const page = "twofaSetup";
  const ctxPage = buildViewContext(req, page).page;
  const userId = getConsumerUserId(req);
  const secret = String(req.body?.secret ?? "").trim();
  const code = String(req.body?.code ?? "").trim();

  if (isSuspiciousForm(req)) {
    return res.status(204).end();
  }

  if (!userId) {
    return res
      .status(401)
      .render("twofa/invalid", buildViewContext(req, "twofaInvalid"));
  }

  if (!secret || !verifyTotpCode(secret, code)) {
    return res.status(400).render(
      "twofa/setup",
      buildViewContext(req, page, {
        form: {
          secret: secret || "SETUP-PENDING",
          otpauthUrl: secret
            ? buildOtpauthUri({ secret, accountName: String(userId) })
            : "",
          setupToken: "",
        },
        error: ctxPage.errorInvalid,
      }),
    );
  }

  try {
    await enableTwoFactor(userId, secret);
  } catch {
    return res
      .status(500)
      .render("twofa/invalid", buildViewContext(req, "twofaInvalid"));
  }

  return res.render("twofa/done", buildViewContext(req, "twofaDone"));
}
