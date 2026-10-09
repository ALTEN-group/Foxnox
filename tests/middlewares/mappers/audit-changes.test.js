/**
 * @jest-environment node
 */

import { jest } from "@jest/globals";
import { buildChanges } from "../../../src/middlewares/mappers/audit-changes.js";

function run(rows) {
  const res = { locals: { rows } };
  const next = jest.fn();
  buildChanges({}, res, next);
  expect(next).toHaveBeenCalledWith();
  return res.locals.rows;
}

describe("buildChanges", () => {
  it("renders UPDATE changes as 'old → new' and drops the raw snapshots", () => {
    const [row] = run([
      {
        id: 1,
        operation: "UPDATE",
        changedKeys: ["description", "length"],
        previous: { description: "before", length: 8 },
        record: { description: "after", length: 12 },
      },
    ]);

    expect(row.changes).toBe("description: before → after\nlength: 8 → 12");
    expect(row).not.toHaveProperty("record");
    expect(row).not.toHaveProperty("previous");
    expect(row).not.toHaveProperty("changedKeys");
  });

  it.each(["pwdHash", "twoFactorSecret", "hash", "deviceTokenHash", "answerHash"])(
    "never leaks the value of secret field %s",
    (key) => {
      const [row] = run([
        {
          operation: "UPDATE",
          changedKeys: [key],
          previous: { [key]: "old-secret-value" },
          record: { [key]: "new-secret-value" },
        },
      ]);

      expect(row.changes).toBe(`${key}: [redacted]`);
      expect(JSON.stringify(row)).not.toMatch(/secret-value/);
    },
  );

  it("lists only non-null columns except id and bookkeeping for INSERT", () => {
    const [row] = run([
      {
        operation: "INSERT",
        changedKeys: ["archivedAt", "createdAt", "creatorName", "id", "name"],
        previous: null,
        record: {
          id: 5,
          name: "Std",
          archivedAt: null,
          createdAt: "2026-10-09",
          creatorName: "admin",
        },
      },
    ]);

    expect(row.changes).toBe("name: Std");
  });

  it("only redacts private props of the row's own table (userId is private on preference only)", () => {
    const base = {
      operation: "UPDATE",
      changedKeys: ["userId"],
      previous: { userId: 1 },
      record: { userId: 2 },
    };
    const [pwd, preference] = run([
      { ...base, tableName: "pwd" },
      { ...base, tableName: "preference" },
    ]);

    expect(pwd.changes).toBe("userId: 1 → 2");
    expect(preference.changes).toBe("userId: [redacted]");
  });

  it("shows the deleted values for DELETE", () => {
    const [row] = run([
      {
        operation: "DELETE",
        changedKeys: ["id", "name"],
        previous: null,
        record: { id: 5, name: "Std" },
      },
    ]);

    expect(row.changes).toBe("name: Std");
  });

  it("truncates long values and serializes objects", () => {
    const [row] = run([
      {
        operation: "UPDATE",
        changedKeys: ["conf"],
        previous: { conf: null },
        record: { conf: { a: "x".repeat(200) } },
      },
    ]);

    expect(row.changes.length).toBeLessThan(120);
    expect(row.changes.startsWith("conf: null → {")).toBe(true);
    expect(row.changes.endsWith("…")).toBe(true);
  });

  it("returns an empty text when nothing meaningful changed", () => {
    const [row] = run([
      { operation: "UPDATE", changedKeys: [], previous: {}, record: {} },
    ]);

    expect(row.changes).toBe("");
  });
});
