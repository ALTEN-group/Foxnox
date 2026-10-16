/** @jest-environment node */
// @ts-check
import { jest } from "@jest/globals";

process.env.WEB_PUBLIC_ORIGIN = "https://auth.example.test";
process.env.WEB_PUBLIC_BASE = "/api/foxnox/web";

const getCache = jest.fn();
jest.unstable_mockModule("../../src/entities/branding.js", () => ({
  default: { getCache },
}));

const { getBranding, loadBrandingFromDb } = await import(
  "../../src/web/branding.js"
);

const FILE = `logo-${"a".repeat(8)}-aaaa-aaaa-aaaa-${"a".repeat(12)}.png`;

const brandingWith = async (row) => {
  getCache.mockResolvedValue([row]);
  await loadBrandingFromDb();
  return getBranding();
};

describe("getBranding logo resolution", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.WEB_BRAND_LOGO_URL;
  });

  it("should expose an uploaded logo as an absolute public URL", async () => {
    const brand = await brandingWith({ logoUrl: "", logoFile: FILE });
    expect(brand.logoUrl).toBe(
      `https://auth.example.test/api/foxnox/web/assets/branding/${FILE}`,
    );
    expect(brand.hasLogo).toBe(true);
  });

  it("should prefer logoUrl over the uploaded file", async () => {
    const brand = await brandingWith({
      logoUrl: "https://cdn.example.test/logo.svg",
      logoFile: FILE,
    });
    expect(brand.logoUrl).toBe("https://cdn.example.test/logo.svg");
  });

  it("should ignore a stored file name the upload route could not have generated", async () => {
    const brand = await brandingWith({ logoUrl: "", logoFile: "../../x.png" });
    expect(brand.logoUrl).toBe("");
    expect(brand.hasLogo).toBe(false);
  });

  it("should fall back to WEB_BRAND_LOGO_URL when neither is set", async () => {
    process.env.WEB_BRAND_LOGO_URL = "https://env.example.test/logo.png";
    const brand = await brandingWith({ logoUrl: "", logoFile: "" });
    expect(brand.logoUrl).toBe("https://env.example.test/logo.png");
  });
});

const FAVICON = `favicon-${"a".repeat(8)}-aaaa-aaaa-aaaa-${"a".repeat(12)}.png`;

describe("getBranding favicon resolution", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should expose an uploaded favicon as an absolute public URL", async () => {
    const brand = await brandingWith({ faviconUrl: "", faviconFile: FAVICON });
    expect(brand.faviconUrl).toBe(
      `https://auth.example.test/api/foxnox/web/assets/branding/${FAVICON}`,
    );
  });

  it("should prefer faviconUrl over the uploaded file", async () => {
    const brand = await brandingWith({
      faviconUrl: "https://cdn.example.test/icon.png",
      faviconFile: FAVICON,
    });
    expect(brand.faviconUrl).toBe("https://cdn.example.test/icon.png");
  });

  it("should ignore a stored file name the upload route could not have generated", async () => {
    const brand = await brandingWith({
      faviconUrl: "",
      faviconFile: "../../x.png",
    });
    expect(brand.faviconUrl).toBe("/api/foxnox/web/assets/favicon.svg");
  });

  it("should serve the packaged favicon when none is configured", async () => {
    const brand = await brandingWith({ faviconUrl: "", faviconFile: "" });
    expect(brand.faviconUrl).toBe("/api/foxnox/web/assets/favicon.svg");
  });
});

describe("getBranding text and button colors", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should expose the stored colors as CSS variables", async () => {
    const brand = await brandingWith({
      brandNameColor: "#111111",
      cardTitleColor: "#222222",
      labelColor: "#333333",
      buttonTextColor: "#fafafa",
    });
    expect(brand.cssVars).toContain("--brand-name-color:#111111");
    expect(brand.cssVars).toContain("--brand-card-title-color:#222222");
    expect(brand.cssVars).toContain("--brand-label-color:#333333");
    expect(brand.cssVars).toContain("--brand-button-text:#fafafa");
  });

  it("should keep the current look when the columns are empty or invalid", async () => {
    const brand = await brandingWith({
      brandNameColor: "red",
      cardTitleColor: "",
    });
    expect(brand.cssVars).toContain("--brand-name-color:#1a1d21");
    expect(brand.cssVars).toContain("--brand-card-title-color:#1a1d21");
    expect(brand.cssVars).toContain("--brand-label-color:#1a1d21");
    expect(brand.cssVars).toContain("--brand-button-text:#ffffff");
  });

  describe("env fallback", () => {
    const ENV = [
      "WEB_BRAND_NAME_COLOR",
      "WEB_BRAND_CARD_TITLE_COLOR",
      "WEB_BRAND_LABEL_COLOR",
      "WEB_BRAND_BUTTON_TEXT_COLOR",
      "WEB_BRAND_FAVICON_URL",
    ];
    afterEach(() => {
      for (const k of ENV) delete process.env[k];
    });

    it("should use WEB_BRAND_* when the column is empty", async () => {
      process.env.WEB_BRAND_NAME_COLOR = "#010101";
      process.env.WEB_BRAND_CARD_TITLE_COLOR = "#020202";
      process.env.WEB_BRAND_LABEL_COLOR = "#030303";
      process.env.WEB_BRAND_BUTTON_TEXT_COLOR = "#040404";
      const brand = await brandingWith({});
      expect(brand.cssVars).toContain("--brand-name-color:#010101");
      expect(brand.cssVars).toContain("--brand-card-title-color:#020202");
      expect(brand.cssVars).toContain("--brand-label-color:#030303");
      expect(brand.cssVars).toContain("--brand-button-text:#040404");
    });

    it("should prefer the stored column over WEB_BRAND_*", async () => {
      process.env.WEB_BRAND_LABEL_COLOR = "#030303";
      const brand = await brandingWith({ labelColor: "#abcdef" });
      expect(brand.cssVars).toContain("--brand-label-color:#abcdef");
    });

    it("should use WEB_BRAND_FAVICON_URL before the packaged favicon", async () => {
      process.env.WEB_BRAND_FAVICON_URL = "https://env.example.test/i.png";
      const brand = await brandingWith({ faviconUrl: "", faviconFile: "" });
      expect(brand.faviconUrl).toBe("https://env.example.test/i.png");
    });
  });
});
