/** @jest-environment node */
// @ts-check
import { EventEmitter } from "node:events";
import { jest } from "@jest/globals";
import { serializeCompare } from "../../../src/middlewares/mappers/serialize-compare.js";
import { clearCompareLocks } from "../../../src/services/compare-lock.js";

describe("serializeCompare", () => {
  beforeEach(() => {
    clearCompareLocks();
  });

  it("should skip locking when userId is missing", () => {
    const next = jest.fn();
    serializeCompare({ body: {} }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("should hold the lock until the response finishes", async () => {
    const order = [];
    const resA = new EventEmitter();
    const resB = new EventEmitter();

    await new Promise((resolve, reject) => {
      serializeCompare({ body: { userId: 9 } }, resA, (err) => {
        if (err) return reject(err);
        order.push("a-start");
        resolve();
      });
    });

    let bStarted = false;
    serializeCompare({ body: { userId: 9 } }, resB, (err) => {
      if (err) throw err;
      bStarted = true;
      order.push("b-start");
    });

    expect(bStarted).toBe(false);
    resA.emit("finish");
    await new Promise((r) => setImmediate(r));
    expect(bStarted).toBe(true);
    expect(order).toEqual(["a-start", "b-start"]);
    resB.emit("finish");
  });
});
