// @ts-check
/**
 * Audit routes: wiring, read-only surface, and that secrets in raw
 * snapshots never reach the HTTP response.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jest } from "@jest/globals";
import request from "supertest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const get = jest.fn((_req, res, next) => {
  res.locals.rows = [
    {
      id: 10,
      tstamp: "2026-10-09T09:00:00.000Z",
      tableName: "pwd",
      operation: "UPDATE",
      action: "UPDATE",
      userId: 3,
      userName: "admin",
      recordId: 7,
      kind: "change",
      changedKeys: ["pwdHash", "twoFactorEnabled"],
      previous: { pwdHash: "old-hash", twoFactorEnabled: false },
      record: { pwdHash: "new-hash", twoFactorEnabled: true },
    },
  ];
  res.locals.total = 1;
  next();
});

jest.unstable_mockModule(
  path.join(__dirname, "../../src/entities/audit.js"),
  () => ({
    default: {
      get,
      privateProps: ["changedKeys", "record", "previous"],
      properties: [
        {
          key: "id",
          type: "integer",
          operations: ["SELECT"],
          isFilterable: true,
          isPrivate: false,
        },
      ],
    },
  }),
);

const express = (await import("express")).default;
const { errorHandler } = await import("@dwtechs/errandler-express");
const { send } = await import("../../src/middlewares/res/send.js");
const audit = (await import("../../src/routes/audit.js")).default;
const aEnt = (await import("../../src/entities/audit.js")).default;

const app = express();
app.use(express.json());
app.use("/foxnox/audit", audit, send(aEnt));
errorHandler(app);

describe("audit routes", () => {
  it("POST /search returns redacted changes without raw snapshots", async () => {
    const res = await request(app)
      .post("/foxnox/audit/search")
      .send({ first: 0, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    const [row] = res.body.rows;
    expect(row.changes).toBe(
      "pwdHash: [redacted]\ntwoFactorEnabled: false → true",
    );
    expect(row).not.toHaveProperty("record");
    expect(row).not.toHaveProperty("previous");
    expect(row).not.toHaveProperty("changedKeys");
    expect(JSON.stringify(res.body)).not.toMatch(/-hash/);
  });

  it.each([
    ["GET", "/foxnox/audit/schema"],
    ["GET", "/foxnox/audit/1/history"],
    ["PUT", "/foxnox/audit"],
    ["POST", "/foxnox/audit"],
    ["POST", "/foxnox/audit/archive"],
    ["DELETE", "/foxnox/audit"],
  ])("%s %s is not a route", async (method, url) => {
    const res = await request(app)[method.toLowerCase()](url).send({ rows: [] });

    expect(res.status).toBe(404);
  });
});
