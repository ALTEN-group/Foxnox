// @ts-check
import fs from "node:fs";
import path from "node:path";
import { getBranding } from "./branding.js";
import { LOCALES_ROOT, WEB_PUBLIC_BASE } from "./engine.js";

/** @type {Map<string, object>} */
const cache = new Map();

/**
 * @param {string} lang
 * @returns {object}
 */
function loadLocale(lang) {
  const key = lang === "fr" ? "fr" : "en";
  const cached = cache.get(key);
  if (cached) return cached;

  const filePath = path.join(LOCALES_ROOT, `${key}.json`);
  const locale = JSON.parse(fs.readFileSync(filePath, "utf8"));
  cache.set(key, locale);
  return locale;
}

/**
 * @param {import('express').Request} req
 * @returns {"en"|"fr"}
 */
export function resolveLang(req) {
  const fromBody = req.body?.lang;
  const fromQuery = req.query?.lang;
  const raw = String(fromBody || fromQuery || "").toLowerCase();
  if (raw.startsWith("fr")) return "fr";
  if (raw.startsWith("en")) return "en";

  const accept = String(req.headers["accept-language"] || "").toLowerCase();
  if (accept.startsWith("fr")) return "fr";
  return "en";
}

/**
 * Build the Handlebars context for a workflow page.
 * Locale JSON shape matches the marketing website pattern (`site`, `pages.*`).
 * Branding comes from WEB_BRAND_* env (one brand per deployment).
 *
 * @param {import('express').Request} req
 * @param {string} pageKey key under locale.pages
 * @param {object} [extra]
 */
export function buildViewContext(req, pageKey, extra = {}) {
  const lang = resolveLang(req);
  const locale = loadLocale(lang);
  const page = locale.pages[pageKey];
  if (!page) {
    throw new Error(`Unknown workflow page key: ${pageKey}`);
  }

  const base = WEB_PUBLIC_BASE;
  const brand = getBranding();

  return {
    lang: locale.lang,
    dir: locale.dir,
    // Prefer env branding over locale site defaults for name/tagline.
    site: {
      ...locale.site,
      name: brand.name,
      tagline: brand.tagline,
    },
    brand,
    common: locale.common,
    page,
    assetBase: base,
    urls: {
      recoverRequest: `${base}/recover`,
      recoverReset: `${base}/recover/reset`,
      twofaVerify: `${base}/2fa/verify`,
      twofaSetup: `${base}/2fa/setup`,
      accountRecoverRequest: `${base}/account-recover`,
      accountRecoverChallenge: `${base}/account-recover/challenge`,
      securityQuestionsSetup: `${base}/security-questions`,
      trustedDevicePrompt: `${base}/trusted-devices/prompt`,
      trustedDevicesManage: `${base}/trusted-devices`,
      passwordExpired: `${base}/password/expired`,
      unlockRequest: `${base}/unlock`,
      unlockConfirm: `${base}/unlock/confirm`,
    },
    form: {},
    error: null,
    ...extra,
  };
}
