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

export type BrandingPreviewPage =
  | "recover"
  | "twofa"
  | "expired"
  | "unlock"
  | "devices"
  | "success"
  | "invalid";

/** Workflow pages the preview can show; values are the keys known by src/web/preview.js. */
export const BRANDING_PREVIEW_PAGES: {
  label: string;
  value: BrandingPreviewPage;
}[] = [
  { label: "Password recovery", value: "recover" },
  { label: "Two-factor verification", value: "twofa" },
  { label: "Expired password", value: "expired" },
  { label: "Account unlock", value: "unlock" },
  { label: "Trusted device prompt", value: "devices" },
  { label: "Success page", value: "success" },
  { label: "Invalid link", value: "invalid" },
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
