// @ts-check

/**
 * Workflow page branding (one brand per Foxnox deployment).
 * Override via WEB_BRAND_* env vars — see docker/conf/.env.dev.example.
 *
 * Colors are restricted to #RGB / #RRGGBB so they are safe to inject as CSS.
 */

/** @type {Readonly<{
 *   name: string,
 *   tagline: string,
 *   logoUrl: string,
 *   logoAlt: string,
 *   mark: string,
 *   primaryColor: string,
 *   secondaryColor: string,
 *   primaryHoverColor: string,
 *   backgroundColor: string,
 *   footerText: string,
 *   footerUrl: string,
 * }>} */
const DEFAULTS = Object.freeze({
  name: "Foxnox",
  tagline: "Account security",
  logoUrl: "",
  logoAlt: "",
  mark: "F",
  primaryColor: "#1f6feb",
  secondaryColor: "#5c6570",
  primaryHoverColor: "#1858c3",
  backgroundColor: "#f4f6f8",
  footerText: "",
  footerUrl: "",
});

/**
 * @param {unknown} value
 * @returns {string|null}
 */
function sanitizeHexColor(value) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v.toLowerCase();
  return null;
}

/**
 * @param {unknown} value
 * @param {number} max
 * @returns {string}
 */
function sanitizeText(value, max) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

/**
 * Allow http(s) URLs or root-relative paths for logos / footer links.
 * @param {unknown} value
 * @returns {string}
 */
function sanitizeUrl(value) {
  if (typeof value !== "string") return "";
  const v = value.trim();
  if (!v) return "";
  if (v.startsWith("/") && !v.startsWith("//")) return v.slice(0, 2048);
  try {
    const u = new URL(v);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    // ignore
  }
  return "";
}

/**
 * @returns {typeof DEFAULTS & { cssVars: string, hasLogo: boolean, hasFooter: boolean }}
 */
export function getBranding() {
  const primaryColor =
    sanitizeHexColor(process.env.WEB_BRAND_PRIMARY_COLOR) ||
    DEFAULTS.primaryColor;
  const secondaryColor =
    sanitizeHexColor(process.env.WEB_BRAND_SECONDARY_COLOR) ||
    DEFAULTS.secondaryColor;
  const primaryHoverColor =
    sanitizeHexColor(process.env.WEB_BRAND_PRIMARY_HOVER_COLOR) ||
    DEFAULTS.primaryHoverColor;
  const backgroundColor =
    sanitizeHexColor(process.env.WEB_BRAND_BACKGROUND_COLOR) ||
    DEFAULTS.backgroundColor;

  const name = sanitizeText(process.env.WEB_BRAND_NAME, 80) || DEFAULTS.name;
  const tagline =
    sanitizeText(process.env.WEB_BRAND_TAGLINE, 160) || DEFAULTS.tagline;
  const mark =
    sanitizeText(process.env.WEB_BRAND_MARK, 2) ||
    name.charAt(0).toUpperCase() ||
    DEFAULTS.mark;
  const logoUrl = sanitizeUrl(process.env.WEB_BRAND_LOGO_URL);
  const logoAlt = sanitizeText(process.env.WEB_BRAND_LOGO_ALT, 120) || name;
  const footerText = sanitizeText(process.env.WEB_BRAND_FOOTER_TEXT, 240);
  const footerUrl = sanitizeUrl(process.env.WEB_BRAND_FOOTER_URL);

  const cssVars = [
    `--brand-primary:${primaryColor}`,
    `--brand-primary-hover:${primaryHoverColor}`,
    `--brand-secondary:${secondaryColor}`,
    `--brand-bg:${backgroundColor}`,
  ].join(";");

  return {
    name,
    tagline,
    logoUrl,
    logoAlt,
    mark,
    primaryColor,
    secondaryColor,
    primaryHoverColor,
    backgroundColor,
    footerText,
    footerUrl,
    cssVars,
    hasLogo: Boolean(logoUrl),
    hasFooter: Boolean(footerText),
  };
}
