/** @jest-environment node */
// @ts-check
import { acquireCompareLock, clearCompareLocks } from "../../src/services/compare-lock.js";

describe("compare lock", () => {
  beforeEach(() => {
    clearCompareLocks();
  });

  it("should run the same userId exclusively", async () => {
    const events = [];
    const first = await acquireCompareLock(7);
    const secondP = acquireCompareLock(7).then((release) => {
      events.push("second");
      release();
    });
    events.push("first");
    first();
    await secondP;
    expect(events).toEqual(["first", "second"]);
  });

  it("should allow different userIds to overlap", async () => {
    const a = await acquireCompareLock(1);
    const b = await acquireCompareLock(2);
    a();
    b();
  });

  it("should ignore a second release on the same lock", async () => {
    const release = await acquireCompareLock(3);
    release();
    release();
    const next = await acquireCompareLock(3);
    next();
  });
});
