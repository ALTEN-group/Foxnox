import { ArchiveInfo, FileInfo } from "@dwtechs/ngx-crud-builder";

/**
 * Represents the workflow-page/email branding (logo, colors, font, radius).
 * Maps to the branding entity in src/entities/branding.js
 */
export interface Branding extends ArchiveInfo {
  id: number | null;
  name: string;
  tagline: string;
  logoUrl: string;
  /** Server-generated name of the uploaded logo; written only by the logo upload route. */
  logoFile: string;
  logoAlt: string;
  mark: string;
  primaryColor: string;
  secondaryColor: string;
  primaryHoverColor: string;
  backgroundColor: string;
  brandNameColor: string;
  cardTitleColor: string;
  labelColor: string;
  buttonTextColor: string;
  faviconUrl: string;
  /** Server-generated name of the uploaded favicon; written only by the favicon upload route. */
  faviconFile: string;
  footerText: string;
  footerUrl: string;
  fontFamily: string;
  radius: string;
}

/**
 * Value held by the branding form. The image controls hold files rather than the stored
 * file names, `logoSource`/`faviconSource` are UI-only switches, and `radius` is a number
 * (stored as "<n>px").
 */
export type BrandingForm = Omit<
  Branding,
  "logoFile" | "faviconFile" | "radius"
> & {
  logoFile: FileInfo[];
  logoSource: "url" | "file";
  faviconFile: FileInfo[];
  faviconSource: "url" | "file";
  radius: number;
};

/** View path of a workflow page, a key known by src/web/preview.js. */
export type BrandingPreviewPage = string;

export type BrandingPreviewLang = "en" | "fr";

export const BRANDING_PREVIEW_LANGS: {
  label: string;
  value: BrandingPreviewLang;
}[] = [
  { label: "English", value: "en" },
  { label: "Français", value: "fr" },
];

export type BrandingPreviewCategory = {
  label: string;
  value: string;
  pages: { label: string; value: BrandingPreviewPage }[];
};

/** Workflow pages the preview can show, grouped by workflow. */
export const BRANDING_PREVIEW_CATEGORIES: BrandingPreviewCategory[] = [
  {
    label: "Password recovery",
    value: "recover",
    pages: [
      { label: "Request", value: "recover/request" },
      { label: "Email sent", value: "recover/sent" },
      { label: "New password", value: "recover/reset" },
      { label: "Password updated", value: "recover/done" },
      { label: "Invalid link", value: "recover/invalid" },
    ],
  },
  {
    label: "Two-factor authentication",
    value: "twofa",
    pages: [
      { label: "Verification", value: "twofa/verify" },
      { label: "Setup", value: "twofa/setup" },
      { label: "Enabled", value: "twofa/done" },
      { label: "Disabled", value: "twofa/disabled" },
      { label: "Invalid step", value: "twofa/invalid" },
    ],
  },
  {
    label: "Account recovery",
    value: "account-recover",
    pages: [
      { label: "Request", value: "account-recover/request" },
      { label: "Email sent", value: "account-recover/sent" },
      { label: "Security questions", value: "account-recover/challenge" },
      { label: "Access restored", value: "account-recover/done" },
    ],
  },
  {
    label: "Security questions",
    value: "security-questions",
    pages: [
      { label: "Setup", value: "security-questions/setup" },
      { label: "Saved", value: "security-questions/done" },
    ],
  },
  {
    label: "Trusted devices",
    value: "devices",
    pages: [
      { label: "Prompt", value: "devices/prompt" },
      { label: "Device trusted", value: "devices/done" },
      { label: "Trust skipped", value: "devices/skipped" },
      { label: "Manage devices", value: "devices/manage" },
      { label: "Trust revoked", value: "devices/revoked" },
      { label: "Invalid step", value: "devices/invalid" },
    ],
  },
  {
    label: "Expired password",
    value: "password",
    pages: [
      { label: "New password", value: "password/expired" },
      { label: "Password updated", value: "password/expired-done" },
    ],
  },
  {
    label: "Account unlock",
    value: "unlock",
    pages: [
      { label: "Request", value: "unlock/request" },
      { label: "Email sent", value: "unlock/sent" },
      { label: "Account unlocked", value: "unlock/done" },
      { label: "Invalid link", value: "unlock/invalid" },
    ],
  },
];

/**
 * Creates a new Branding entity with default values
 * @returns {Branding} A new Branding object with null/default values
 * @example
 * const newBranding = brandingFactory();
 */
export const brandingFactory = (): Branding => ({
  id: null,
  name: "Foxnox",
  tagline: "Account security",
  logoUrl: "",
  logoFile: "",
  logoAlt: "",
  mark: "F",
  primaryColor: "#1f6feb",
  secondaryColor: "#5c6570",
  primaryHoverColor: "#1858c3",
  backgroundColor: "#f4f6f8",
  brandNameColor: "#1a1d21",
  cardTitleColor: "#1a1d21",
  labelColor: "#1a1d21",
  buttonTextColor: "#ffffff",
  faviconUrl: "",
  faviconFile: "",
  footerText: "",
  footerUrl: "",
  fontFamily: "system",
  radius: "12px",
  ...new ArchiveInfo(),
});
