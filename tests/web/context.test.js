/** @jest-environment node */
// @ts-check
import { jest } from "@jest/globals";

jest.unstable_mockModule("../../src/web/branding.js", () => ({
  getBranding: () => ({
    name: "Acme Security",
    tagline: "Account protection",
  }),
}));

const { buildViewContext } = await import("../../src/web/context.js");

describe("buildViewContext", () => {
  it("uses the configured brand name in the browser page title", () => {
    const context = buildViewContext(
      { headers: {}, body: {}, query: {} },
      "recoverRequest",
    );

    expect(context.page.title).toBe("Reset your password — Acme Security");
  });
});
