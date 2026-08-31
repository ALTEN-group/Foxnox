// @ts-check
/**
 * A client updates a row by re-sending what `POST /<entity>/search` returned.
 * Private columns are stripped from that response, so they come back as `null`
 * and must not reach the UPDATE statement.
 */
import ppEnt from "../../src/entities/pwd-policy.js";
import pEnt from "../../src/entities/pwd.js";
import { dropNulls } from "../../src/middlewares/mappers/drop-nulls.js";

/**
 * @param {object} ent
 * @param {Record<string, unknown>[]} rows
 * @returns {{ called: boolean, rows: Record<string, unknown>[] }}
 */
function run(ent, rows) {
  const req = { body: { rows } };
  let called = false;
  dropNulls(ent)(
    /** @type {any} */ (req),
    /** @type {any} */ ({}),
    () => {
      called = true;
    },
  );
  return { called, rows: req.body.rows };
}

describe("dropNulls on PUT payloads", () => {
  // The exact body a full-row round-trip produces on PUT /foxnox/.
  const roundTrip = {
    id: 1,
    userId: 1,
    pwdHash: null,
    pwdUpdatedAt: 1787993503783,
    pwdExpiry: 1788127200000,
    failedAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    archived: false,
    archivedAt: null,
    createdAt: "2026-08-29T08:51:43.783Z",
    creatorName: null,
    updatedAt: null,
    updaterName: null,
  };

  it("drops a null pwdHash so the NOT NULL column is not overwritten", () => {
    const { called, rows } = run(pEnt, [{ ...roundTrip }]);
    expect(called).toBe(true);
    expect(rows[0]).not.toHaveProperty("pwdHash");
  });

  it("drops a null twoFactorSecret instead of wiping the 2FA secret", () => {
    const { rows } = run(pEnt, [{ ...roundTrip }]);
    expect(rows[0]).not.toHaveProperty("twoFactorSecret");
  });

  it("keeps deliberate erasures of nullable columns", () => {
    const { rows } = run(pEnt, [{ ...roundTrip }]);
    expect(rows[0].lockedUntil).toBeNull();
    expect(rows[0].lastLoginAt).toBeNull();
  });

  it("leaves non-null values untouched", () => {
    const { rows } = run(pEnt, [{ ...roundTrip }]);
    expect(rows[0]).toMatchObject({
      id: 1,
      pwdUpdatedAt: 1787993503783,
      failedAttempts: 0,
      twoFactorEnabled: false,
    });
  });

  it("drops nulls on NOT NULL policy columns", () => {
    const { rows } = run(ppEnt, [
      { id: 1, name: "default", symbols: null, expiryDays: null },
    ]);
    expect(rows[0]).not.toHaveProperty("symbols");
    // `expiryDays` is nullable, so an explicit null still means "clear it".
    expect(rows[0].expiryDays).toBeNull();
  });

  it("passes through a body without rows", () => {
    const req = { body: {} };
    let called = false;
    dropNulls(pEnt)(
      /** @type {any} */ (req),
      /** @type {any} */ ({}),
      () => {
        called = true;
      },
    );
    expect(called).toBe(true);
  });
});
