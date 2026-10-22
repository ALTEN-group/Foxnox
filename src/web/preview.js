// @ts-check
import { getBranding, pickBrandingOverrides } from "./branding.js";
import { buildViewContext } from "./context.js";

const POLICY = Object.freeze({
  minLength: 12,
  maxLength: 64,
  lowerCase: true,
  upperCase: true,
  number: true,
  symbol: true,
});

const QUESTIONS = Object.freeze([
  { id: 1, label: "What was the name of your first pet?" },
  { id: 2, label: "In which city were you born?" },
  { id: 3, label: "What was your first school called?" },
]);

/**
 * Workflow pages the admin can preview, keyed by view path and rendered with
 * placeholder data (`key` is the locale entry under `pages`).
 */
const PAGES = Object.freeze({
  "recover/request": { key: "recoverRequest" },
  "recover/sent": { key: "recoverSent" },
  "recover/reset": {
    key: "recoverReset",
    extra: { form: { token: "preview" }, policy: POLICY },
  },
  "recover/done": { key: "recoverDone" },
  "recover/invalid": { key: "recoverInvalid" },
  "twofa/verify": { key: "twofaVerify" },
  "twofa/setup": {
    key: "twofaSetup",
    extra: { form: { secret: "JBSWY3DPEHPK3PXP", setupToken: "" } },
  },
  "twofa/done": { key: "twofaDone" },
  "twofa/disabled": { key: "twofaDisabled" },
  "twofa/invalid": { key: "twofaInvalid" },
  "account-recover/request": { key: "accountRecoverRequest" },
  "account-recover/sent": { key: "accountRecoverSent" },
  "account-recover/challenge": {
    key: "accountRecoverChallenge",
    extra: { form: { token: "preview", questions: QUESTIONS } },
  },
  "account-recover/done": { key: "accountRecoverDone" },
  "security-questions/setup": {
    key: "securityQuestionsSetup",
    extra: {
      form: {
        slots: [{ slot: 1 }, { slot: 2 }, { slot: 3 }],
        catalog: QUESTIONS,
        replacing: false,
      },
    },
  },
  "security-questions/done": { key: "securityQuestionsDone" },
  "devices/prompt": { key: "trustedDevicePrompt" },
  "devices/done": { key: "trustedDeviceDone" },
  "devices/skipped": { key: "trustedDeviceSkipped" },
  "devices/manage": {
    key: "trustedDevicesManage",
    extra: {
      form: {
        devices: [
          {
            id: 1,
            deviceName: "Laptop",
            lastUsedAt: "2026-01-15",
            expiresAt: "2026-02-14",
          },
          {
            id: 2,
            deviceName: "",
            lastUsedAt: "2026-01-10",
            expiresAt: "2026-02-09",
          },
        ],
      },
    },
  },
  "devices/revoked": { key: "trustedDeviceRevoked" },
  "devices/invalid": { key: "trustedDeviceInvalid" },
  "password/expired": { key: "passwordExpired", extra: { policy: POLICY } },
  "password/expired-done": { key: "passwordExpiredDone" },
  "unlock/request": { key: "unlockRequest" },
  "unlock/sent": { key: "unlockSent" },
  "unlock/done": { key: "unlockDone" },
  "unlock/invalid": { key: "unlockInvalid" },
});

/**
 * POST /branding/preview — renders a real workflow template with the branding
 * from the request body laid over the stored row. Nothing is read or written
 * in the database and no token is involved, so every page can be shown.
 *
 * @type {import('express').RequestHandler}
 */
export function previewBranding(req, res, next) {
  const name = req.body?.page;
  if (typeof name !== "string" || !Object.hasOwn(PAGES, name))
    return next({ statusCode: 400, message: "Unknown preview page" });
  const page = PAGES[/** @type {keyof typeof PAGES} */ (name)];

  const brand = getBranding(pickBrandingOverrides(req.body?.branding));
  const ctx = buildViewContext(
    req,
    page.key,
    "extra" in page ? page.extra : {},
  );
  res.render(
    name,
    {
      ...ctx,
      brand,
      site: { ...ctx.site, name: brand.name, tagline: brand.tagline },
      // brand.css is served from the stored row, so the unsaved vars travel inline.
      previewCss: `:root{${brand.cssVars}}`,
    },
    (err, html) => {
      if (err) return next(err);
      res.json({ html });
    },
  );
}
