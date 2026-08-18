// @ts-check
import * as OTPAuth from "otpauth";
import { getBranding } from "../web/branding.js";

/**
 * @returns {string} base32 secret
 */
export function generateTotpSecret() {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

/**
 * @param {{ secret: string, accountName?: string }} params
 * @returns {string} otpauth:// URI (for QR / authenticator apps)
 */
export function buildOtpauthUri({ secret, accountName = "user" }) {
  const brand = getBranding();
  const totp = new OTPAuth.TOTP({
    issuer: brand.name || "Foxnox",
    label: accountName,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.toString();
}

/**
 * @param {string} secret base32
 * @param {string} code 6-digit user input
 * @returns {boolean}
 */
export function verifyTotpCode(secret, code) {
  const normalized = String(code || "").trim();
  if (!/^\d{6}$/.test(normalized) || !secret) return false;
  try {
    const totp = new OTPAuth.TOTP({
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    return totp.validate({ token: normalized, window: 1 }) !== null;
  } catch {
    return false;
  }
}
