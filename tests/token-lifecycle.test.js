// @ts-check
/**
 * Token pipeline integration: create → find → consume / bump / invalidate,
 * plus login-challenge wrappers — against an in-memory SQL mock (no Postgres).
 */
import { jest } from "@jest/globals";
import { createTokenDbMock } from "./helpers/token-db-mock.js";

process.env.PWD_SECRET = "test-secret-for-unit-tests-only";
process.env.WEB_PUBLIC_ORIGIN = "http://localhost:8100";
process.env.WEB_PUBLIC_BASE = "/api/pwd/web";

const db = createTokenDbMock();

jest.unstable_mockModule("@dwtechs/antity-pgsql", () => ({
  execute: (sql, params, tx) => db.execute(sql, params, tx),
  getCache: jest.fn(),
  query: { select: jest.fn(), update: jest.fn(), insert: jest.fn() },
}));

const {
  createWorkflowToken,
  findValidWorkflowToken,
  consumeWorkflowToken,
  bumpWorkflowTokenAttempts,
  TOKEN_TYPES,
} = await import("../src/services/token.js");

const {
  createLoginChallenge,
  findValidLoginChallenge,
  consumeLoginChallenge,
} = await import("../src/services/challenge.js");

describe("workflow token lifecycle", () => {
  beforeEach(() => {
    db.reset();
  });

  it("creates a token, finds it by plaintext, then consumes it", async () => {
    const created = await createWorkflowToken({
      userId: 42,
      typeName: TOKEN_TYPES.PASSWORD_RESET,
    });

    expect(created.id).toBeGreaterThan(0);
    expect(created.plaintext).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(created.typeName).toBe(TOKEN_TYPES.PASSWORD_RESET);
    expect(created.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const found = await findValidWorkflowToken({
      plaintext: created.plaintext,
      typeName: TOKEN_TYPES.PASSWORD_RESET,
    });
    expect(found).toEqual(
      expect.objectContaining({
        id: created.id,
        userId: 42,
        attempts: 0,
        maxAttempts: 3,
      }),
    );

    await consumeWorkflowToken(created.id);

    const after = await findValidWorkflowToken({
      plaintext: created.plaintext,
      typeName: TOKEN_TYPES.PASSWORD_RESET,
    });
    expect(after).toBeNull();
  });

  it("rejects unknown plaintext and wrong type", async () => {
    const created = await createWorkflowToken({
      userId: 7,
      typeName: TOKEN_TYPES.ACCOUNT_UNLOCK,
    });

    expect(
      await findValidWorkflowToken({
        plaintext: "not-the-token",
        typeName: TOKEN_TYPES.ACCOUNT_UNLOCK,
      }),
    ).toBeNull();

    expect(
      await findValidWorkflowToken({
        plaintext: created.plaintext,
        typeName: TOKEN_TYPES.PASSWORD_RESET,
      }),
    ).toBeNull();
  });

  it("archives prior unused tokens of the same type for the user", async () => {
    const first = await createWorkflowToken({
      userId: 9,
      typeName: TOKEN_TYPES.ACCOUNT_RECOVERY,
    });
    const second = await createWorkflowToken({
      userId: 9,
      typeName: TOKEN_TYPES.ACCOUNT_RECOVERY,
    });

    expect(
      await findValidWorkflowToken({
        plaintext: first.plaintext,
        typeName: TOKEN_TYPES.ACCOUNT_RECOVERY,
      }),
    ).toBeNull();

    expect(
      await findValidWorkflowToken({
        plaintext: second.plaintext,
        typeName: TOKEN_TYPES.ACCOUNT_RECOVERY,
      }),
    ).toMatchObject({ id: second.id, userId: 9 });
  });

  it("rejects after maxAttempts via bump", async () => {
    const created = await createWorkflowToken({
      userId: 3,
      typeName: TOKEN_TYPES.ACCOUNT_RECOVERY,
    });

    await bumpWorkflowTokenAttempts(created.id);
    await bumpWorkflowTokenAttempts(created.id);
    await bumpWorkflowTokenAttempts(created.id);

    expect(
      await findValidWorkflowToken({
        plaintext: created.plaintext,
        typeName: TOKEN_TYPES.ACCOUNT_RECOVERY,
      }),
    ).toBeNull();
  });

  it("throws on unknown token type", async () => {
    await expect(
      createWorkflowToken({ userId: 1, typeName: "No such type" }),
    ).rejects.toThrow(/Unknown or archived token type/);
  });
});

describe("login challenge lifecycle", () => {
  beforeEach(() => {
    db.reset();
  });

  it("mints a 2FA challenge URL and resolves/consumes it", async () => {
    const minted = await createLoginChallenge({ userId: 11, kind: "2fa" });

    expect(minted.path).toBe("/2fa/verify");
    expect(minted.url).toContain("challenge=");
    expect(minted.typeName).toBe(TOKEN_TYPES.TWO_FA_CHALLENGE);

    const found = await findValidLoginChallenge({
      plaintext: minted.challenge,
      kind: "2fa",
    });
    expect(found).toMatchObject({ id: minted.id, userId: 11 });

    await consumeLoginChallenge(minted.id);

    expect(
      await findValidLoginChallenge({
        plaintext: minted.challenge,
        kind: "2fa",
      }),
    ).toBeNull();
  });

  it("does not resolve a challenge under the wrong kind", async () => {
    const minted = await createLoginChallenge({
      userId: 11,
      kind: "expired-password",
    });

    expect(
      await findValidLoginChallenge({
        plaintext: minted.challenge,
        kind: "2fa",
      }),
    ).toBeNull();

    expect(
      await findValidLoginChallenge({
        plaintext: minted.challenge,
        kind: "expired-password",
      }),
    ).toMatchObject({ userId: 11 });
  });
});
