// @ts-check
import {
  hashToken,
  randomTokenPlaintext,
  safeEqualToken,
} from "../services/token-crypto.js";

/** Cookie + form field name for workflow HTML CSRF (double-submit). */
export const CSRF_COOKIE = "foxnox_csrf";
export const CSRF_FIELD = "csrf";

/** Signed CSRF tokens live as long as the form timing window allows. */
const CSRF_TTL_MS = 60 * 60 * 1000;

/**
 * @returns {boolean}
 */
function cookieSecure() {
  return (
    process.env.COOKIE_SECURE === "1" || process.env.NODE_ENV === "production"
  );
}

/**
 * @param {import('express').Request} req
 * @param {string} name
 * @returns {string}
 */
export function readCookie(req, name) {
  const raw = String(req.headers.cookie || "");
  if (!raw) return "";
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      return part.slice(idx + 1).trim();
    }
  }
  return "";
}

/**
 * Mint a signed CSRF token: `nonce.expiry.hmac`.
 * @returns {string}
 */
export function mintCsrfToken() {
  const nonce = randomTokenPlaintext(16);
  const exp = String(Date.now() + CSRF_TTL_MS);
  const payload = `${nonce}.${exp}`;
  return `${payload}.${hashToken(payload)}`;
}

/**
 * @param {unknown} token
 * @returns {boolean}
 */
export function verifyCsrfToken(token) {
  if (typeof token !== "string" || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [nonce, exp, sig] = parts;
  if (!nonce || !exp || !sig) return false;
  const expiry = Number(exp);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;
  const payload = `${nonce}.${exp}`;
  return safeEqualToken(sig, hashToken(payload));
}

/**
 * @param {import('express').Response} res
 * @param {string} token
 */
export function setCsrfCookie(res, token) {
  const parts = [
    `${CSRF_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(CSRF_TTL_MS / 1000)}`,
  ];
  if (cookieSecure()) parts.push("Secure");
  res.append("Set-Cookie", parts.join("; "));
}

/**
 * Ensure `req.csrfToken` (reuse valid cookie or mint). Sets cookie when minting.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {string}
 */
export function ensureCsrfToken(req, res) {
  const fromCookie = readCookie(req, CSRF_COOKIE);
  if (fromCookie && verifyCsrfToken(fromCookie)) {
    // @ts-expect-error attach for handlers / buildViewContext
    req.csrfToken = fromCookie;
    return fromCookie;
  }
  const token = mintCsrfToken();
  setCsrfCookie(res, token);
  // @ts-expect-error
  req.csrfToken = token;
  return token;
}

/**
 * Double-submit: cookie and body field must match and verify as signed.
 *
 * @param {import('express').Request} req
 * @returns {boolean}
 */
export function isValidCsrf(req) {
  const cookieToken = readCookie(req, CSRF_COOKIE);
  const bodyToken = String(req.body?.[CSRF_FIELD] ?? "");
  if (!cookieToken || !bodyToken) return false;
  if (!safeEqualToken(cookieToken, bodyToken)) return false;
  return verifyCsrfToken(bodyToken);
}

/**
 * Issue CSRF on every workflow request; require it on POST/PUT/PATCH/DELETE.
 *
 * @type {import('express').RequestHandler}
 */
export function csrfProtection(req, res, next) {
  ensureCsrfToken(req, res);

  const method = String(req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return next();
  }

  if (!isValidCsrf(req)) {
    return res
      .status(403)
      .type("html")
      .send(
        "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>Session Expired</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f4f6f8}.card{background:#fff;padding:2rem;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.08);max-width:400px;text-align:center}a{color:#1f6feb}</style></head><body><div class=\"card\"><h2>Session Expired</h2><p>Your verification session or form token has expired or is invalid.</p><p><a href=\"javascript:history.back()\">Go back</a> to try again.</p></div></body></html>",
      );
  }
  return next();
}
