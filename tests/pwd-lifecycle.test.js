// @ts-check
/**
 * Password service lifecycle: policy, rotate, unlock, auth state, 2FA —
 * against an in-memory mock (no Postgres).
 */
import { jest } from "@jest/globals";
import { createAuthDbMock } from "./helpers/auth-db-mock.js";

process.env.PWD_SECRET = "test-secret-for-unit-tests-only";
process.env.WEB_PUBLIC_ORIGIN = "http://localhost:8100";
process.env.WEB_PUBLIC_BASE = "/api/foxnox/web";

const db = createAuthDbMock();

jest.unstable_mockModule("@dwtechs/antity-pgsql", () => ({
  execute: (sql, params, tx) => db.execute(sql, params, tx),
  getCache: jest.fn(),
  query: { select: jest.fn(), update: jest.fn(), insert: jest.fn() },
}));

jest.unstable_mockModule("../src/entities/pwd-policy.js", () => ({
  default: {
    getCache: () => db.getPolicyCache(),
  },
}));

jest.unstable_mockModule("../src/entities/pwd.js", () => ({
  default: {
    query: {
      select: (...args) => db.pwdSelect(...args),
      update: (...args) => db.pwdUpdate(...args),
    },
  },
}));

const {
  getActivePwdPolicy,
  getPasswordFormPolicy,
  passwordMeetsPolicy,
  rotatePassword,
  unlockAccount,
  getPwdAuthState,
  getTwoFactorSecret,
  enableTwoFactor,
  disableTwoFactor,
} = await import("../src/services/pwd.js");

const STRONG = "Abcdef1!xyZZ";

describe("password policy", () => {
  beforeEach(() => {
    db.reset();
  });

  it("reads active policy and form hints", async () => {
    db.seedPolicy({
      length: 10,
      number: true,
      symbol: true,
      lowerCase: true,
      upperCase: true,
      expiryDays: 90,
    });
    const policy = await getActivePwdPolicy();
    expect(policy).toMatchObject({ length: 10, expiryDays: 90 });
    expect(await getPasswordFormPolicy()).toEqual({
      minLength: 10,
      maxLength: 64,
    });
  });

  it("returns null / defaults when no active policy", async () => {
    expect(await getActivePwdPolicy()).toBeNull();
    expect(await getPasswordFormPolicy()).toEqual({
      minLength: 12,
      maxLength: 64,
    });
  });

  it("validates passwords against an explicit policy", async () => {
    const policy = {
      id: 1,
      length: 10,
      number: true,
      symbol: true,
      lowerCase: true,
      upperCase: true,
      expiryDays: 0,
    };
    expect(await passwordMeetsPolicy(STRONG, policy)).toBe(true);
    expect(await passwordMeetsPolicy("short1!", policy)).toBe(false);
  });
});

describe("rotatePassword / unlockAccount", () => {
  beforeEach(() => {
    db.reset();
    db.seedPolicy({
      length: 10,
      number: true,
      symbol: true,
      lowerCase: true,
      upperCase: true,
      expiryDays: 30,
    });
  });

  it("hashes, clears lockout, and sets expiry", async () => {
    db.seedPwd({
      userId: 42,
      pwdHash: "old-hash",
      failedAttempts: 4,
      lockedUntil: new Date(Date.now() + 60_000),
    });

    await expect(rotatePassword(42, STRONG)).resolves.toEqual({
      updated: true,
    });

    const row = db.pwds[0];
    expect(row.pwdHash).not.toBe("old-hash");
    expect(row.pwdHash).toMatch(/./);
    expect(row.failedAttempts).toBe(0);
    expect(row.lockedUntil).toBeNull();
    expect(row.pwdExpiry).toBeInstanceOf(Date);
    expect(row.pwdExpiry.getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects weak passwords", async () => {
    db.seedPwd({ userId: 7, pwdHash: "old" });
    await expect(rotatePassword(7, "weak")).rejects.toMatchObject({
      code: "WEAK_PASSWORD",
    });
  });

  it("rejects missing pwd rows", async () => {
    await expect(rotatePassword(99, STRONG)).rejects.toMatchObject({
      code: "PWD_NOT_FOUND",
    });
  });

  it("clears lockout on unlock", async () => {
    db.seedPwd({
      userId: 11,
      failedAttempts: 5,
      lockedUntil: new Date(Date.now() + 120_000),
    });
    await expect(unlockAccount(11)).resolves.toEqual({ updated: true });
    expect(db.pwds[0].failedAttempts).toBe(0);
    expect(db.pwds[0].lockedUntil).toBeNull();
  });

  it("unlock rejects missing pwd rows", async () => {
    await expect(unlockAccount(404)).rejects.toMatchObject({
      code: "PWD_NOT_FOUND",
    });
  });
});

describe("auth state and 2FA", () => {
  beforeEach(() => {
    db.reset();
  });

  it("returns public auth fields", async () => {
    const lockedUntil = new Date(Date.now() + 60_000);
    db.seedPwd({
      userId: 3,
      twoFactorEnabled: true,
      failedAttempts: 2,
      lockedUntil,
      pwdExpiry: new Date("2099-01-01T00:00:00.000Z"),
    });
    expect(await getPwdAuthState(3)).toMatchObject({
      userId: 3,
      twoFactorEnabled: true,
      failedAttempts: 2,
    });
    expect(await getPwdAuthState(999)).toBeNull();
  });

  it("enables then disables two-factor", async () => {
    db.seedPwd({ userId: 5 });
    await enableTwoFactor(5, "JBSWY3DPEHPK3PXP");
    expect(await getTwoFactorSecret(5)).toBe("JBSWY3DPEHPK3PXP");
    expect(db.pwds[0].twoFactorEnabled).toBe(true);

    await disableTwoFactor(5);
    expect(await getTwoFactorSecret(5)).toBeNull();
    expect(db.pwds[0].twoFactorEnabled).toBe(false);
  });

  it("2FA helpers reject missing pwd rows", async () => {
    await expect(enableTwoFactor(1, "ABC")).rejects.toMatchObject({
      code: "PWD_NOT_FOUND",
    });
    await expect(disableTwoFactor(1)).rejects.toMatchObject({
      code: "PWD_NOT_FOUND",
    });
  });
});
