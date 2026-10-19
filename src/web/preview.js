// @ts-check
import { getBranding, pickBrandingOverrides } from "./branding.js";
import { buildViewContext } from "./context.js";

/** Workflow pages the admin can preview, rendered with placeholder data. */
const PAGES = Object.freeze({
  recover: { view: "recover/request", key: "recoverRequest" },
  twofa: { view: "twofa/verify", key: "twofaVerify" },
  expired: {
    view: "password/expired",
    key: "passwordExpired",
    extra: {
      policy: {
        minLength: 12,
        maxLength: 64,
        lowerCase: true,
        upperCase: true,
        number: true,
        symbol: true,
      },
    },
  },
  unlock: { view: "unlock/request", key: "unlockRequest" },
  devices: { view: "devices/prompt", key: "trustedDevicePrompt" },
  success: { view: "recover/done", key: "recoverDone" },
  invalid: { view: "recover/invalid", key: "recoverInvalid" },
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
    page.view,
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
