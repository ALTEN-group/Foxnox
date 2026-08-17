// @ts-check
import { hash } from "@dwtechs/hashitaka";

process.env.PWD_SECRET = "test-secret-for-unit-tests-only";
process.env.WEB_PUBLIC_ORIGIN = "http://localhost:8100";
process.env.WEB_PUBLIC_BASE = "/api/pwd/web";

describe("workflow token hashing", () => {
  it("hashes deterministically via Hashitaka HMAC", async () => {
    const { hashToken, safeEqualToken, randomTokenPlaintext } = await import(
      "../src/services/token-crypto.js"
    );
    const a = hashToken("abc");
    const b = hashToken("abc");
    const c = hashToken("xyz");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toBe(hash("abc", "test-secret-for-unit-tests-only"));
    expect(safeEqualToken(a, b)).toBe(true);
    expect(safeEqualToken(a, c)).toBe(false);
    expect(randomTokenPlaintext(16)).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("deep links", () => {
  it("builds absolute workflow URLs", async () => {
    const { buildDeepLink } = await import("../src/web/deep-link.js");
    expect(buildDeepLink("/recover/reset", { token: "tok", lang: "fr" })).toBe(
      "http://localhost:8100/api/pwd/web/recover/reset?token=tok&lang=fr",
    );
  });
});
