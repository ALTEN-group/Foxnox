/** @jest-environment node */
// @ts-check
import { jest } from "@jest/globals";

const recordFailedAttempt = jest.fn(async () => {});
const resetFailedAttempts = jest.fn(async () => {});

jest.unstable_mockModule("../../../src/services/pwd.js", () => ({
  recordFailedAttempt,
  resetFailedAttempts,
}));

const { trackFailedAttempt, clearLoginAttempts } = await import(
  "../../../src/middlewares/mappers/track-login-attempt.js"
);

describe("trackFailedAttempt", () => {
  beforeEach(() => {
    recordFailedAttempt.mockReset().mockResolvedValue(undefined);
    resetFailedAttempts.mockReset().mockResolvedValue(undefined);
  });

  it("should wait for the lockout bump before forwarding a 401", async () => {
    let bumped = false;
    recordFailedAttempt.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 20));
      bumped = true;
    });
    const err = { statusCode: 401, message: "Unauthorized" };
    await new Promise((resolve) => {
      trackFailedAttempt(err, { body: { userId: 4 } }, {}, (forwarded) => {
        expect(forwarded).toBe(err);
        expect(bumped).toBe(true);
        resolve();
      });
    });
    expect(recordFailedAttempt).toHaveBeenCalledWith(4);
  });

  it("should not bump on a non-401 error", () => {
    const next = jest.fn();
    const err = { statusCode: 403, message: "Account locked" };
    trackFailedAttempt(err, { body: { userId: 4 } }, {}, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(recordFailedAttempt).not.toHaveBeenCalled();
  });
});

describe("clearLoginAttempts", () => {
  beforeEach(() => {
    resetFailedAttempts.mockReset().mockResolvedValue(undefined);
  });

  it("should wait for the counter reset before continuing", async () => {
    let reset = false;
    resetFailedAttempts.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 20));
      reset = true;
    });
    const res = {
      locals: { rows: [{ failedAttempts: 2, lockedUntil: new Date() }] },
    };
    await new Promise((resolve) => {
      clearLoginAttempts({ body: { userId: 8 } }, res, () => {
        expect(reset).toBe(true);
        expect(res.locals.rows[0].failedAttempts).toBe(0);
        expect(res.locals.rows[0].lockedUntil).toBeNull();
        resolve();
      });
    });
  });
});
