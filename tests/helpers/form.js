// @ts-check
import { CSRF_COOKIE, mintCsrfToken } from "../../src/web/csrf.js";

/**
 * Fields that pass `isSuspiciousForm` (honeypot empty + rendered 2s ago).
 * Returns a urlencoded string so repeated keys (questionIds / answers) become
 * arrays under Express `urlencoded({ extended: false })`.
 *
 * @param {Record<string, unknown>} [extra]
 * @returns {string}
 */
export function validFormBody(extra = {}) {
  /** @type {Array<[string, string]>} */
  const pairs = [
    ["website", ""],
    ["rendered_at", String(Date.now() - 2000)],
  ];

  for (const [key, value] of Object.entries(extra)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        pairs.push([key, String(item)]);
      }
    } else if (value != null) {
      pairs.push([key, String(value)]);
    }
  }

  return new URLSearchParams(pairs).toString();
}

/**
 * Mint a CSRF token and return Cookie header + form body with matching `csrf`.
 *
 * @param {Record<string, unknown>} [fields]
 * @returns {{ cookie: string, body: string, token: string }}
 */
export function csrfForm(fields = {}) {
  const token = mintCsrfToken();
  return {
    token,
    cookie: `${CSRF_COOKIE}=${encodeURIComponent(token)}`,
    body: validFormBody({ ...fields, csrf: token }),
  };
}
