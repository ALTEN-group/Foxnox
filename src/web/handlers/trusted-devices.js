// @ts-check
import { buildViewContext } from "../context.js";
import { isSuspiciousForm } from "../form-guards.js";

/**
 * Trusted-device consent (post-2FA) and management (revoke).
 */

/** Placeholder list until GET trusted-devices is wired for the current user. */
const STUB_DEVICES = [
  {
    id: 1,
    deviceName: "Office laptop",
    lastUsedAt: "2026-08-17",
    expiresAt: "2026-11-17",
  },
  {
    id: 2,
    deviceName: "",
    lastUsedAt: "2026-08-10",
    expiresAt: "2026-10-10",
  },
];

/** @type {import('express').RequestHandler} */
export function getTrustedDevicePrompt(req, res) {
  const challenge = String(req.query?.challenge ?? "").trim();
  res.render(
    "trusted-devices/prompt",
    buildViewContext(req, "trustedDevicePrompt", {
      form: { challenge },
    }),
  );
}

/** @type {import('express').RequestHandler} */
export function postTrustedDevicePrompt(req, res) {
  if (isSuspiciousForm(req)) return res.status(204).end();

  const trust = String(req.body?.trust ?? "no");
  if (trust !== "yes") {
    return res.render(
      "trusted-devices/skipped",
      buildViewContext(req, "trustedDeviceSkipped"),
    );
  }

  // TODO: create user_trusted_device row (hash cookie token, UA, IP, expiry).
  return res.render(
    "trusted-devices/done",
    buildViewContext(req, "trustedDeviceDone"),
  );
}

/** @type {import('express').RequestHandler} */
export function getTrustedDevicesManage(req, res) {
  // TODO: load non-archived trusted devices for the authenticated user.
  res.render(
    "trusted-devices/manage",
    buildViewContext(req, "trustedDevicesManage", {
      form: { devices: STUB_DEVICES },
    }),
  );
}

/** @type {import('express').RequestHandler} */
export function postTrustedDevicesManage(req, res) {
  if (isSuspiciousForm(req)) return res.status(204).end();

  const deviceId = String(req.body?.deviceId ?? "").trim();
  if (!deviceId) {
    return res.status(400).render(
      "trusted-devices/manage",
      buildViewContext(req, "trustedDevicesManage", {
        form: { devices: STUB_DEVICES },
        error: buildViewContext(req, "trustedDevicesManage").page.errorGeneric,
      }),
    );
  }

  // TODO: archive the trusted device for the authenticated user.
  return res.render(
    "trusted-devices/revoked",
    buildViewContext(req, "trustedDeviceRevoked"),
  );
}
