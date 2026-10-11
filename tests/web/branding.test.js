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
