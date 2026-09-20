import { ArchiveInfo } from "@dwtechs/ngx-crud-builder";

/**
 * Represents the workflow-page/email branding (logo, colors, font, radius).
 * Maps to the branding entity in src/entities/branding.js
 */
export interface Branding extends ArchiveInfo {
  id: number | null;
  name: string;
  tagline: string;
  logoUrl: string;
  logoAlt: string;
  mark: string;
  primaryColor: string;
  secondaryColor: string;
  primaryHoverColor: string;
  backgroundColor: string;
  footerText: string;
  footerUrl: string;
  fontFamily: string;
  radius: string;
}

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
  logoAlt: "",
  mark: "F",
  primaryColor: "#1f6feb",
  secondaryColor: "#5c6570",
  primaryHoverColor: "#1858c3",
  backgroundColor: "#f4f6f8",
  footerText: "",
  footerUrl: "",
  fontFamily: "system",
  radius: "12px",
  ...new ArchiveInfo(),
});
