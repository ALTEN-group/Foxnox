// @ts-check

/**
 * Shared anti-bot checks inspired by the ALTEN contact form.
 * Fail closed without revealing why (no tip-off for automated clients).
 *
 * @param {import('express').Request} req
 * @returns {boolean} true when the submission looks automated
 */
export function isSuspiciousForm(req) {
  const honeypot = String(req.body?.website ?? "").trim();
  if (honeypot) return true;

  const renderedAt = Number(req.body?.rendered_at ?? 0);
  if (!Number.isFinite(renderedAt) || renderedAt <= 0) return true;

  const ageMs = Date.now() - renderedAt;
  if (ageMs < 1500 || ageMs > 1000 * 60 * 60) return true;

  return false;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidEmail(value) {
  if (typeof value !== "string") return false;
  const email = value.trim();
  // Pragmatic check — full RFC validation is unnecessary for the form gate.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}
