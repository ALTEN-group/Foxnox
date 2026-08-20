// @ts-check
import { buildLoginResumeUrl } from "../login-resume.js";
import { buildViewContext } from "../context.js";
import { getConsumerUserId } from "../consumer.js";
import { isSuspiciousForm } from "../form-guards.js";
import {
  consumeLoginChallenge,
  findValidLoginChallenge,
} from "../../services/challenge.js";
import {
  archiveTrustedDevice,
  createTrustedDevice,
  getTrustedDeviceCookieName,
  listTrustedDevices,
  mintTrustedDeviceToken,
} from "../../services/trusted-devices.js";

/**
 * @returns {boolean}
 */
function cookieSecure() {
  return (
    process.env.COOKIE_SECURE === "1" ||
    process.env.NODE_ENV === "production"
  );
}

/**
 * Path=/ so Gatelin login receives the cookie on /api/gatelin/sessions.
 * @param {import('express').Response} res
 * @param {string} plaintext
 * @param {Date} expiresAt
 */
function setTrustedDeviceCookie(res, plaintext, expiresAt) {
  const maxAge = Math.max(
    0,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  );
  const parts = [
    `${getTrustedDeviceCookieName()}=${encodeURIComponent(plaintext)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (cookieSecure()) parts.push("Secure");
  res.append("Set-Cookie", parts.join("; "));
}

/** @type {import('express').RequestHandler} */
export async function getTrustedDevicePrompt(req, res) {
  const challenge = String(req.query?.challenge ?? "").trim();
  if (!challenge) {
    return res
      .status(400)
      .render(
        "trusted-devices/invalid",
        buildViewContext(req, "trustedDeviceInvalid"),
      );
  }

  const valid = await findValidLoginChallenge({
    plaintext: challenge,
    kind: "trusted-device",
  });
  if (!valid) {
    return res
      .status(400)
      .render(
        "trusted-devices/invalid",
        buildViewContext(req, "trustedDeviceInvalid"),
      );
  }

  res.render(
    "trusted-devices/prompt",
    buildViewContext(req, "trustedDevicePrompt", {
      form: { challenge },
    }),
  );
}

/** @type {import('express').RequestHandler} */
export async function postTrustedDevicePrompt(req, res) {
  if (isSuspiciousForm(req)) return res.status(204).end();

  const challenge = String(req.body?.challenge ?? "").trim();
  const valid = await findValidLoginChallenge({
    plaintext: challenge,
    kind: "trusted-device",
  });
  if (!valid) {
    return res
      .status(400)
      .render(
        "trusted-devices/invalid",
        buildViewContext(req, "trustedDeviceInvalid"),
      );
  }

  const trust = String(req.body?.trust ?? "no");
  try {
    await consumeLoginChallenge(valid.id);

    if (trust === "yes") {
      const minted = mintTrustedDeviceToken();
      await createTrustedDevice({
        userId: valid.userId,
        deviceTokenHash: minted.hash,
        deviceName: String(req.body?.deviceName ?? "").trim() || undefined,
        ipAddress: String(req.ip || req.socket?.remoteAddress || "").slice(
          0,
          45,
        ),
        userAgent: String(req.headers["user-agent"] || "").slice(0, 500),
        expiresAt: minted.expiresAt,
      });
      setTrustedDeviceCookie(res, minted.plaintext, minted.expiresAt);
    }

    const resumeUrl = await buildLoginResumeUrl(valid.userId);
    return res.redirect(303, resumeUrl);
  } catch {
    return res
      .status(500)
      .render(
        "trusted-devices/invalid",
        buildViewContext(req, "trustedDeviceInvalid"),
      );
  }
}

/** @type {import('express').RequestHandler} */
export async function getTrustedDevicesManage(req, res) {
  const userId = getConsumerUserId(req);
  if (!userId) {
    return res.status(401).render(
      "trusted-devices/manage",
      buildViewContext(req, "trustedDevicesManage", {
        form: { devices: [] },
        error: buildViewContext(req, "trustedDevicesManage").page.errorGeneric,
      }),
    );
  }

  const devices = await listTrustedDevices(userId);
  res.render(
    "trusted-devices/manage",
    buildViewContext(req, "trustedDevicesManage", {
      form: { devices },
    }),
  );
}

/** @type {import('express').RequestHandler} */
export async function postTrustedDevicesManage(req, res) {
  if (isSuspiciousForm(req)) return res.status(204).end();

  const userId = getConsumerUserId(req);
  const deviceId = Number(req.body?.deviceId ?? 0);

  if (!userId || !Number.isInteger(deviceId) || deviceId < 1) {
    const devices = userId ? await listTrustedDevices(userId) : [];
    return res.status(400).render(
      "trusted-devices/manage",
      buildViewContext(req, "trustedDevicesManage", {
        form: { devices },
        error: buildViewContext(req, "trustedDevicesManage").page.errorGeneric,
      }),
    );
  }

  await archiveTrustedDevice(userId, deviceId);
  return res.render(
    "trusted-devices/revoked",
    buildViewContext(req, "trustedDeviceRevoked"),
  );
}
