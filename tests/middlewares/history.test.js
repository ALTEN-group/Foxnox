/**
 * @jest-environment node
 */

import { jest } from "@jest/globals";

jest.unstable_mockModule("@dwtechs/antity-pgsql", () => ({
  execute: jest.fn(),
}));

describe("history middleware", () => {
  let history;
  let execute;
  let req, res, next;

  beforeAll(async () => {
    const antity = await import("@dwtechs/antity-pgsql");
    execute = antity.execute;
    const module = await import("../../src/middlewares/history.js");
    history = module.default;
  });

  beforeEach(() => {
    execute.mockReset();
    req = { params: { id: "7" } };
    res = { locals: {} };
    next = jest.fn();
  });

  describe("get", () => {
    it("should call next(400) when id param is missing", () => {
      req.params.id = undefined;

      history.get("pwd")(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Missing id",
      });
      expect(execute).not.toHaveBeenCalled();
    });

    it("should query with the default 'public' schema when none is given", () => {
      execute.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      history.get("pwd")(req, res, next);

      expect(execute).toHaveBeenCalledWith(
        expect.any(String),
        ["public", ["pwd"], "7"],
        null,
      );
    });

    it("should query with a custom schema when given", () => {
      execute.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      history.get("pwd", "gateway")(req, res, next);

      expect(execute).toHaveBeenCalledWith(
        expect.any(String),
        ["gateway", ["pwd"], "7"],
        null,
      );
    });

    it("should call next(404) when no history rows are found", async () => {
      execute.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      history.get("pwd")(req, res, next);
      await Promise.resolve();
      await Promise.resolve();

      expect(next).toHaveBeenCalledWith({
        statusCode: 404,
        message: "history not found",
      });
    });

    it("should call next(404) when the single row is the initial INSERT", async () => {
      execute.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ operation: "INSERT" }],
      });

      history.get("pwd")(req, res, next);
      await Promise.resolve();
      await Promise.resolve();

      expect(next).toHaveBeenCalledWith({
        statusCode: 404,
        message: "history not found",
      });
    });

    it("should set res.locals.rows/total and call next() when history exists beyond the initial INSERT", async () => {
      const rows = [
        {
          id: 1,
          tstamp: "2026-01-01T00:00:00.000Z",
          operation: "INSERT",
          consumerId: 1,
          consumerName: "alice",
          record: { id: 7 },
        },
        {
          id: 2,
          tstamp: "2026-01-02T00:00:00.000Z",
          operation: "UPDATE",
          consumerId: 1,
          consumerName: "alice",
          record: { id: 7, lockedUntil: "2026-01-02T00:00:00.000Z" },
        },
      ];
      execute.mockResolvedValueOnce({ rowCount: 2, rows });

      history.get("pwd")(req, res, next);
      await Promise.resolve();
      await Promise.resolve();

      expect(res.locals.rows).toHaveLength(2);
      expect(res.locals.total).toBe(2);
      expect(next).toHaveBeenCalledWith();
    });

    it("should merge rows from the same transaction into one grouped entry", async () => {
      const rows = [
        {
          id: 1,
          tstamp: "2026-01-02T00:00:00.000Z",
          operation: "UPDATE",
          consumerId: 1,
          consumerName: "alice",
          record: { id: 7, userId: 3 },
        },
        {
          id: 2,
          tstamp: "2026-01-02T00:00:00.000Z",
          operation: "UPDATE",
          consumerId: 1,
          consumerName: "alice",
          record: { id: 7, failedAttempts: 2 },
        },
      ];
      execute.mockResolvedValueOnce({ rowCount: 2, rows });

      history.get("pwd")(req, res, next);
      await Promise.resolve();
      await Promise.resolve();

      expect(res.locals.rows).toEqual([
        {
          id: 1,
          tstamp: "2026-01-02T00:00:00.000Z",
          operation: "UPDATE",
          consumerId: 1,
          consumerName: "alice",
          record: { id: 7, userId: 3, failedAttempts: 2 },
        },
      ]);
      expect(res.locals.total).toBe(1);
      expect(next).toHaveBeenCalledWith();
    });

    it("should call next(404) when the only grouped action is the initial INSERT", async () => {
      const rows = [
        {
          id: 1,
          tstamp: "2026-01-01T00:00:00.000Z",
          operation: "INSERT",
          consumerId: 1,
          consumerName: "alice",
          record: { id: 7, name: "Default" },
        },
        {
          id: 2,
          tstamp: "2026-01-01T00:00:00.000Z",
          operation: "INSERT",
          consumerId: 1,
          consumerName: "alice",
          record: { id: 7, length: 8 },
        },
      ];
      execute.mockResolvedValueOnce({ rowCount: 2, rows });

      history.get(["pwd_policy"])(req, res, next);
      await Promise.resolve();
      await Promise.resolve();

      expect(next).toHaveBeenCalledWith({
        statusCode: 404,
        message: "history not found",
      });
    });

    it("should call next(err) when the query rejects", async () => {
      const err = new Error("db down");
      execute.mockRejectedValueOnce(err);

      history.get("pwd")(req, res, next);
      await Promise.resolve();
      await Promise.resolve();

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("groupByAction", () => {
    it("should return one entry per row when tstamp/consumerId/record.id all differ", () => {
      const rows = [
        {
          id: 1,
          tstamp: "2026-01-01T00:00:00.000Z",
          operation: "INSERT",
          consumerId: 1,
          consumerName: "alice",
          record: { id: 7 },
        },
        {
          id: 2,
          tstamp: "2026-01-02T00:00:00.000Z",
          operation: "UPDATE",
          consumerId: 1,
          consumerName: "alice",
          record: { id: 7 },
        },
      ];

      expect(history.groupByAction(rows)).toEqual(rows.map((r) => ({ ...r })));
    });

    it("should merge rows sharing tstamp/consumerId/record.id and combine their record fields", () => {
      const rows = [
        {
          id: 1,
          tstamp: "2026-01-02T00:00:00.000Z",
          operation: "UPDATE",
          consumerId: 1,
          consumerName: "alice",
          record: { id: 7, name: "Default" },
        },
        {
          id: 2,
          tstamp: "2026-01-02T00:00:00.000Z",
          operation: "UPDATE",
          consumerId: 1,
          consumerName: "alice",
          record: { id: 7, length: 8 },
        },
      ];

      expect(history.groupByAction(rows)).toEqual([
        {
          id: 1,
          tstamp: "2026-01-02T00:00:00.000Z",
          operation: "UPDATE",
          consumerId: 1,
          consumerName: "alice",
          record: { id: 7, name: "Default", length: 8 },
        },
      ]);
    });

    it("should keep rows separate when record.id differs even if tstamp/consumerId match", () => {
      const rows = [
        {
          id: 1,
          tstamp: "2026-01-02T00:00:00.000Z",
          operation: "UPDATE",
          consumerId: 1,
          consumerName: "alice",
          record: { id: 101 },
        },
        {
          id: 2,
          tstamp: "2026-01-02T00:00:00.000Z",
          operation: "UPDATE",
          consumerId: 1,
          consumerName: "alice",
          record: { id: 102 },
        },
      ];

      expect(history.groupByAction(rows)).toHaveLength(2);
    });
  });

  describe("filterMeaningful", () => {
    it("should always keep the first row", () => {
      const rows = [{ operation: "INSERT", record: { id: 7 } }];

      expect(history.filterMeaningful(rows)).toEqual(rows);
    });

    it("should drop later rows that only change ignored columns", () => {
      const rows = [
        { operation: "INSERT", record: { id: 7, lastLoginAt: null } },
        {
          operation: "UPDATE",
          record: { id: 7, lastLoginAt: "2026-01-02T00:00:00.000Z" },
        },
        {
          operation: "UPDATE",
          record: { id: 7, lastLoginAt: "2026-01-03T00:00:00.000Z" },
        },
      ];

      expect(history.filterMeaningful(rows, ["lastLoginAt"])).toEqual([
        rows[0],
      ]);
    });

    it("should keep a row that changes a non-ignored column, then resume ignoring from it", () => {
      const rows = [
        {
          operation: "INSERT",
          record: { id: 7, lastLoginAt: null, lockedUntil: null },
        },
        {
          operation: "UPDATE",
          record: {
            id: 7,
            lastLoginAt: "2026-01-02T00:00:00.000Z",
            lockedUntil: null,
          },
        },
        {
          operation: "UPDATE",
          record: {
            id: 7,
            lastLoginAt: "2026-01-02T00:00:00.000Z",
            lockedUntil: "2026-01-03T00:00:00.000Z",
          },
        },
        {
          operation: "UPDATE",
          record: {
            id: 7,
            lastLoginAt: "2026-01-04T00:00:00.000Z",
            lockedUntil: "2026-01-03T00:00:00.000Z",
          },
        },
      ];

      expect(history.filterMeaningful(rows, ["lastLoginAt"])).toEqual([
        rows[0],
        rows[2],
      ]);
    });

    it("should always ignore updatedAt/updaterId/updaterName even without being asked", () => {
      const rows = [
        {
          operation: "INSERT",
          record: {
            id: 7,
            updatedAt: null,
            updaterId: null,
            updaterName: null,
          },
        },
        {
          operation: "UPDATE",
          record: {
            id: 7,
            updatedAt: "2026-01-02T00:00:00.000Z",
            updaterId: -1,
            updaterName: "system",
          },
        },
      ];

      expect(history.filterMeaningful(rows)).toEqual([rows[0]]);
    });

    it("should default to an empty ignore list", () => {
      const rows = [
        { operation: "INSERT", record: { id: 7, name: "a" } },
        { operation: "UPDATE", record: { id: 7, name: "b" } },
      ];

      expect(history.filterMeaningful(rows)).toEqual(rows);
    });
  });

  describe("get with ignoreCols", () => {
    it("should drop rows where only ignored columns changed", async () => {
      const rows = [
        {
          id: 1,
          tstamp: "2026-01-01T00:00:00.000Z",
          operation: "INSERT",
          consumerId: 1,
          consumerName: "alice",
          record: { id: 7, lastLoginAt: null },
        },
        {
          id: 2,
          tstamp: "2026-01-02T00:00:00.000Z",
          operation: "UPDATE",
          consumerId: -1,
          consumerName: "system",
          record: { id: 7, lastLoginAt: "2026-01-02T00:00:00.000Z" },
        },
      ];
      execute.mockResolvedValueOnce({ rowCount: 2, rows });

      history.get("pwd", "public", ["lastLoginAt"])(req, res, next);
      await Promise.resolve();
      await Promise.resolve();

      expect(next).toHaveBeenCalledWith({
        statusCode: 404,
        message: "history not found",
      });
    });

    it("should keep rows where a non-ignored column changed", async () => {
      const rows = [
        {
          id: 1,
          tstamp: "2026-01-01T00:00:00.000Z",
          operation: "INSERT",
          consumerId: 1,
          consumerName: "alice",
          record: { id: 7, lockedUntil: null },
        },
        {
          id: 2,
          tstamp: "2026-01-02T00:00:00.000Z",
          operation: "UPDATE",
          consumerId: 1,
          consumerName: "alice",
          record: { id: 7, lockedUntil: "2026-01-02T00:00:00.000Z" },
        },
      ];
      execute.mockResolvedValueOnce({ rowCount: 2, rows });

      history.get("pwd", "public", ["lastLoginAt"])(req, res, next);
      await Promise.resolve();
      await Promise.resolve();

      expect(res.locals.rows).toHaveLength(2);
      expect(res.locals.total).toBe(2);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
