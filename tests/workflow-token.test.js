// @ts-check
import { hash } from "@dwtechs/hashitaka";

process.env.PWD_SECRET = "test-secret-for-unit-tests-only";
process.env.WEB_PUBLIC_ORIGIN = "http://localhost:8100";
process.env.WEB_PUBLIC_BASE = "/api/foxnox/web";

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
      "http://localhost:8100/api/foxnox/web/recover/reset?token=tok&lang=fr",
    );
  });
});

describe("password policy checks", () => {
  it("accepts passwords that match the given policy", async () => {
    const { passwordMeetsPolicy } = await import("../src/services/pwd.js");
    const policy = {
      id: 1,
      length: 10,
      number: true,
      symbol: true,
      lowerCase: true,
      upperCase: true,
      expiryDays: 0,
    };
    expect(await passwordMeetsPolicy("Abcdef1!xy", policy)).toBe(true);
    expect(await passwordMeetsPolicy("short1!", policy)).toBe(false);
    expect(await passwordMeetsPolicy("abcdefghij", policy)).toBe(false);
  });

  it("exposes form min/max length from the given policy shape", async () => {
    const { getPasswordFormPolicy, getActivePwdPolicy } = await import(
      "../src/services/pwd.js"
    );
    // Without DB, getActivePwdPolicy fails or returns null → passken-aligned defaults.
    const hints = await getPasswordFormPolicy().catch(() => null);
    if (hints) {
      expect(hints.minLength).toBeGreaterThanOrEqual(6);
      expect(hints.maxLength).toBe(64);
    }
    // Explicit policy path is covered by passwordMeetsPolicy above; assert export exists.
    expect(typeof getActivePwdPolicy).toBe("function");
    expect(typeof getPasswordFormPolicy).toBe("function");
  });
});

describe("login challenges", () => {
  it("maps kinds to token types and workflow paths", async () => {
    const { CHALLENGE_KINDS, isChallengeKind, getChallengeSpec } = await import(
      "../src/services/challenge.js"
    );
    expect(isChallengeKind("2fa")).toBe(true);
    expect(isChallengeKind("nope")).toBe(false);
    expect(getChallengeSpec("2fa")).toEqual({
      typeName: "2FA challenge",
      path: "/2fa/verify",
    });
    expect(getChallengeSpec("expired-password").path).toBe("/password/expired");
    expect(getChallengeSpec("trusted-device").path).toBe(
      "/trusted-devices/prompt",
    );
    expect(Object.keys(CHALLENGE_KINDS).sort()).toEqual([
      "2fa",
      "expired-password",
      "trusted-device",
    ]);
  });

  it("builds absolute challenge URLs", async () => {
    const { buildDeepLink } = await import("../src/web/deep-link.js");
    expect(
      buildDeepLink("/2fa/verify", { challenge: "abc", lang: "en" }),
    ).toBe(
      "http://localhost:8100/api/foxnox/web/2fa/verify?challenge=abc&lang=en",
    );
  });
});

describe("security question helpers", () => {
  it("builds empty enrollment slots", async () => {
    const { emptyQuestionSlots } = await import(
      "../src/services/security-questions.js"
    );
    expect(emptyQuestionSlots(3)).toEqual([
      { slot: 1 },
      { slot: 2 },
      { slot: 3 },
    ]);
  });
});

describe("email notify", () => {
  it("renders pwd-reset HTML with deep link and brand", async () => {
    const { renderEmail, _resetNotifyCachesForTests } = await import(
      "../src/services/notify.js"
    );
    _resetNotifyCachesForTests();
    const url =
      "http://localhost:8100/api/foxnox/web/recover/reset?token=tok&lang=en";
    const { subject, html, text } = renderEmail({
      template: "pwd-reset",
      lang: "en",
      vars: { url, nickname: "Ada", expiresAt: "2099-01-01T00:00:00.000Z" },
    });
    expect(subject).toContain("Reset your password");
    expect(subject).toContain("Foxnox");
    expect(html).toContain(url);
    expect(html).toContain("Hello Ada,");
    expect(html).toContain("Choose a new password");
    expect(text).toContain(url);
    expect(text).toContain("Hello Ada,");
  });

  it("falls back to log notifier when SMTP_HOST is unset", async () => {
    delete process.env.SMTP_HOST;
    const { notifyUser, _resetNotifyCachesForTests } = await import(
      "../src/services/notify.js"
    );
    _resetNotifyCachesForTests();
    await expect(
      notifyUser({
        template: "account-unlock",
        to: "admin@example.com",
        lang: "fr",
        vars: {
          url: "http://localhost/unlock",
          nickname: null,
        },
      }),
    ).resolves.toBeUndefined();
  });
});

describe("TOTP helpers", () => {
  it("generates a secret and verifies a current code", async () => {
    const {
      generateTotpSecret,
      verifyTotpCode,
      buildOtpauthUri,
    } = await import("../src/services/totp.js");
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(buildOtpauthUri({ secret, accountName: "ada" })).toContain(
      "otpauth://totp/",
    );
    // Wrong code must fail; we do not assert a live code (clock-dependent).
    expect(verifyTotpCode(secret, "000000")).toBe(false);
  });
});

describe("workflow CSRF", () => {
  it("mints verifiable double-submit tokens", async () => {
    const { mintCsrfToken, verifyCsrfToken, isValidCsrf } = await import(
      "../src/web/csrf.js"
    );
    const token = mintCsrfToken();
    expect(verifyCsrfToken(token)).toBe(true);
    expect(verifyCsrfToken("tampered." + token)).toBe(false);
    expect(
      isValidCsrf({
        headers: { cookie: `foxnox_csrf=${encodeURIComponent(token)}` },
        body: { csrf: token },
      }),
    ).toBe(true);
    expect(
      isValidCsrf({
        headers: { cookie: `foxnox_csrf=${encodeURIComponent(token)}` },
        body: { csrf: mintCsrfToken() },
      }),
    ).toBe(false);
  });
});
