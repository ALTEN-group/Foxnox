/** @jest-environment node */
// @ts-check
import { jest } from "@jest/globals";

const execute = jest.fn();

jest.unstable_mockModule("@dwtechs/antity-pgsql", () => ({ execute }));

const { checkPwdExpiryPostpone } = await import(
  "../../../src/middlewares/validators/check-pwd-expiry-postpone.js"
);

const STORED = new Date("2026-12-01T15:30:00.000Z");

const run = async (rows) => {
  const next = jest.fn();
  await checkPwdExpiryPostpone(
    /** @type {any} */ ({ body: { rows } }),
    /** @type {any} */ ({}),
    next,
  );
  return next;
};

describe("checkPwdExpiryPostpone", () => {
  beforeEach(() => {
    execute.mockReset();
    execute.mockResolvedValue({ rows: [{ id: 3, pwdExpiry: STORED }] });
  });

  it("rejects an earlier date with 400", async () => {
    const next = await run([{ id: 3, pwdExpiry: "2026-11-30T12:00:00.000Z" }]);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it("accepts the unchanged value (full-row update)", async () => {
    const next = await run([{ id: 3, pwdExpiry: STORED.toISOString() }]);
    expect(next).toHaveBeenCalledWith();
  });

  it("accepts a later date", async () => {
    const next = await run([{ id: 3, pwdExpiry: "2027-01-01T12:00:00.000Z" }]);
    expect(next).toHaveBeenCalledWith();
  });

  it("always accepts clearing the expiry", async () => {
    const next = await run([{ id: 3, pwdExpiry: null }]);
    expect(next).toHaveBeenCalledWith();
    expect(execute).not.toHaveBeenCalled();
  });

  it("skips rows that omit pwdExpiry without querying", async () => {
    const next = await run([{ id: 3, twoFactorEnabled: true }]);
    expect(next).toHaveBeenCalledWith();
    expect(execute).not.toHaveBeenCalled();
  });

  it("accepts any date when no expiry is stored yet", async () => {
    execute.mockResolvedValue({ rows: [{ id: 3, pwdExpiry: null }] });
    const next = await run([{ id: 3, pwdExpiry: "2026-10-10T12:00:00.000Z" }]);
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects the whole batch when one row goes earlier", async () => {
    execute.mockResolvedValue({
      rows: [
        { id: 3, pwdExpiry: STORED },
        { id: 4, pwdExpiry: STORED },
      ],
    });
    const next = await run([
      { id: 3, pwdExpiry: "2027-01-01T12:00:00.000Z" },
      { id: 4, pwdExpiry: "2026-11-01T12:00:00.000Z" },
    ]);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it("forwards database errors", async () => {
    const err = new Error("db down");
    execute.mockRejectedValue(err);
    const next = await run([{ id: 3, pwdExpiry: "2027-01-01T12:00:00.000Z" }]);
    expect(next).toHaveBeenCalledWith(err);
  });
});
