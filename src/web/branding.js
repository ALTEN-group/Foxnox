// @ts-check
import { log } from "@dwtechs/winstan";
import bEnt from "../entities/branding.js";

/**
 * Workflow page branding (one brand per Foxnox deployment).
 * Customizable at runtime from the admin UI (`branding` table); falls back to
 * WEB_BRAND_* env vars — see docker/conf/.env.dev.example — for any field the
 * stored row doesn't override.
 *
 * Colors are restricted to #RGB / #RRGGBB so they are safe to inject as CSS.
 */

/** @type {Record<string, unknown>|null} */
let dbRow = null;

/**
 * Loads the single non-archived `branding` row into memory.
 * Called once at boot and again after any admin write (see routes/branding.js).
 * @returns {Promise<void>}
 */
export async function loadBrandingFromDb() {
  try {
    const rows = await bEnt.getCache();
    dbRow = rows[0] || null;
  } catch (err) {
    log.error(`loadBrandingFromDb failed: ${err?.message || err}`);
  }
}

const FONT_FAMILIES = Object.freeze({
  system:
    '"Segoe UI", system-ui, -apple-system, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"Courier New", ui-monospace, monospace',
});

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
 *   fontFamily: string,
 *   radius: string,
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
  fontFamily: FONT_FAMILIES.system,
  radius: "12px",
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
 * @param {unknown} value
 * @returns {string}
 */
function sanitizeFontFamily(value) {
  if (typeof value !== "string") return "";
  const key = value.trim().toLowerCase();
  return FONT_FAMILIES[key] || "";
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
function sanitizeRadius(value) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return /^([0-9]|1[0-9]|2[0-4])px$/.test(v) ? v : null;
}

/**
 * Relative luminance per WCAG, used to flag low-contrast brand colors.
 * @param {string} hex
 * @returns {number}
 */
function relativeLuminance(hex) {
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const channel = (c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * WCAG contrast ratio between two hex colors (1 to 21).
 * @param {string} hexA
 * @param {string} hexB
 * @returns {number}
 */
function contrastRatio(hexA, hexB) {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const [lighter, darker] = lA > lB ? [lA, lB] : [lB, lA];
  return (lighter + 0.05) / (darker + 0.05);
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
  const row = dbRow || {};

  const primaryColor =
    sanitizeHexColor(row.primaryColor) ||
    sanitizeHexColor(process.env.WEB_BRAND_PRIMARY_COLOR) ||
    DEFAULTS.primaryColor;
  const secondaryColor =
    sanitizeHexColor(row.secondaryColor) ||
    sanitizeHexColor(process.env.WEB_BRAND_SECONDARY_COLOR) ||
    DEFAULTS.secondaryColor;
  const primaryHoverColor =
    sanitizeHexColor(row.primaryHoverColor) ||
    sanitizeHexColor(process.env.WEB_BRAND_PRIMARY_HOVER_COLOR) ||
    DEFAULTS.primaryHoverColor;
  const backgroundColor =
    sanitizeHexColor(row.backgroundColor) ||
    sanitizeHexColor(process.env.WEB_BRAND_BACKGROUND_COLOR) ||
    DEFAULTS.backgroundColor;

  const name =
    sanitizeText(row.name, 80) ||
    sanitizeText(process.env.WEB_BRAND_NAME, 80) ||
    DEFAULTS.name;
  const tagline =
    sanitizeText(row.tagline, 160) ||
    sanitizeText(process.env.WEB_BRAND_TAGLINE, 160) ||
    DEFAULTS.tagline;
  const mark =
    sanitizeText(row.mark, 2) ||
    sanitizeText(process.env.WEB_BRAND_MARK, 2) ||
    name.charAt(0).toUpperCase() ||
    DEFAULTS.mark;
  const logoUrl = sanitizeUrl(row.logoUrl) || sanitizeUrl(process.env.WEB_BRAND_LOGO_URL);
  const logoAlt =
    sanitizeText(row.logoAlt, 120) ||
    sanitizeText(process.env.WEB_BRAND_LOGO_ALT, 120) ||
    name;
  const footerText =
    sanitizeText(row.footerText, 240) ||
    sanitizeText(process.env.WEB_BRAND_FOOTER_TEXT, 240);
  const footerUrl = sanitizeUrl(row.footerUrl) || sanitizeUrl(process.env.WEB_BRAND_FOOTER_URL);
  const fontFamily =
    sanitizeFontFamily(row.fontFamily) ||
    sanitizeFontFamily(process.env.WEB_BRAND_FONT) ||
    DEFAULTS.fontFamily;
  const radius =
    sanitizeRadius(row.radius) ||
    sanitizeRadius(process.env.WEB_BRAND_RADIUS) ||
    DEFAULTS.radius;

  // Buttons render white text on primaryColor — warn early if that's unreadable.
  if (contrastRatio(primaryColor, "#ffffff") < 3) {
    log.warn(
      `getBranding: WEB_BRAND_PRIMARY_COLOR ${primaryColor} has low contrast against white button text`,
    );
  }

  const cssVars = [
    `--brand-primary:${primaryColor}`,
    `--brand-primary-hover:${primaryHoverColor}`,
    `--brand-secondary:${secondaryColor}`,
    `--brand-bg:${backgroundColor}`,
    `--brand-font:${fontFamily}`,
    `--brand-radius:${radius}`,
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
    fontFamily,
    radius,
    cssVars,
    hasLogo: Boolean(logoUrl),
    hasFooter: Boolean(footerText),
  };
}
