/** @jest-environment node */
import { jest } from "@jest/globals";
import request from "supertest";

process.env.PWD_SECRET = "archive-route-test-only";

// Keep real antity entities and execute. Mock its pool's query boundary so
// token-service SQL and the entity's internal execute share one ordered trace.
const execute = jest.fn();
jest.unstable_mockModule("pg-pool", () => ({
  default: class {
    query(...args) {
      return execute(...args);
    }
  },
}));

const { default: app } = await import("../../src/app.js");
const ENDPOINT = "/foxnox/pwd/archive";
const CONSUMER = {
  "x-consumer-user-id": "42",
  "x-consumer-name": "archive-admin",
};
const TOKEN_SQL =
  'UPDATE token SET archived = TRUE, "archivedAt" = NOW(), "updatedAt" = NOW(), "updaterId" = $2, "updaterName" = $3 WHERE "userId" IN (SELECT "userId" FROM pwd WHERE id = ANY($1::int[])) AND archived IS NOT TRUE';

function archive(rows = [7, 8], headers = CONSUMER) {
  return request(app).post(ENDPOINT).set(headers).send({ rows });
}

function expectSuccess(res) {
  expect(res.status).toBe(200);
  expect(res.headers["content-type"]).toMatch(/json/);
  expect(res.body).toEqual({ rows: [], total: 0 });
}

// The assembled app uses errandler's text error response.
function expectError(res, status, message) {
  expect(res.status).toBe(status);
  expect(res.headers["content-type"]).toMatch(/text\/html/);
  expect(res.text).toBe(message);
}

function expectTokenArchive(index, ids) {
  const [sql, args] = execute.mock.calls[index];
  expect(sql.replace(/\s+/g, " ").trim()).toBe(TOKEN_SQL);
  expect(args).toEqual([ids, 42, "archive-admin"]);
}

function expectPasswordArchive(index, ids) {
  const [sql, args] = execute.mock.calls[index];
  const n = ids.length;
  expect(sql).toBe(
    `UPDATE public.pwd SET archived = true, "updaterId" = $${n + 1}, "updaterName" = $${n + 2} WHERE id IN (${ids.map((_, i) => `$${i + 1}`).join(", ")})`,
  );
  expect(args).toEqual([...ids, 42, "archive-admin"]);
}

describe("POST /foxnox/pwd/archive", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    execute.mockResolvedValue({ rows: [], rowCount: 2 });
    jest.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error(
        "Unexpected outbound HTTP request during password archive",
      );
    });
  });

  afterEach(() => {
    expect(globalThis.fetch).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it.each([
    ["bare numeric ids", [7, 8], [7, 8]],
    ["bare string ids", ["7", "8"], ["7", "8"]],
    ["object ids", [{ id: 7 }, { id: "8" }], [7, "8"]],
    ["mixed duplicate ids", [7, { id: "8" }, "7", 8], [7, "8", "7", 8]],
  ])(
    "should revoke owner workflows before archiving %s with the audited actor",
    async (_name, rows, ids) => {
      expectSuccess(await archive(rows));
      expect(execute).toHaveBeenCalledTimes(2);
      expectTokenArchive(0, [7, 8]);
      expectPasswordArchive(1, ids);
    },
  );

  it("should wait for token invalidation to finish before password archive", async () => {
    let release;
    let started;
    const entered = new Promise((resolve) => {
      started = resolve;
    });
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    execute.mockImplementationOnce(() => {
      started();
      return gate;
    });
    let finished = false;
    const pending = archive().then((res) => {
      finished = true;
      return res;
    });
    try {
      await entered;
      await new Promise((resolve) => setImmediate(resolve));
      expect(execute).toHaveBeenCalledTimes(1);
      expectTokenArchive(0, [7, 8]);
      expect(finished).toBe(false);
    } finally {
      release({ rows: [], rowCount: 3 });
    }
    expectSuccess(await pending);
    expectPasswordArchive(1, [7, 8]);
  });

  it("should stop password archive on token failure and allow a successful retry", async () => {
    execute.mockRejectedValueOnce(
      Object.assign(new Error("token unavailable"), { statusCode: 500 }),
    );
    expectError(await archive(), 500, "Postgre error: token unavailable");
    expect(execute).toHaveBeenCalledTimes(1);
    expectTokenArchive(0, [7, 8]);

    expectSuccess(await archive());
    expect(execute).toHaveBeenCalledTimes(3);
    expectTokenArchive(1, [7, 8]);
    expectPasswordArchive(2, [7, 8]);
  });

  it("should allow retry after tokens were revoked but password archive failed", async () => {
    execute
      .mockResolvedValueOnce({ rows: [], rowCount: 3 })
      .mockRejectedValueOnce(
        Object.assign(new Error("password unavailable"), { statusCode: 500 }),
      );
    expectError(await archive(), 500, "Postgre error: password unavailable");
    expectTokenArchive(0, [7, 8]);
    expectPasswordArchive(1, [7, 8]);
    execute.mockResolvedValue({ rows: [], rowCount: 0 });
    expectSuccess(await archive());
    expect(execute).toHaveBeenCalledTimes(4);
    expectTokenArchive(2, [7, 8]);
    expectPasswordArchive(3, [7, 8]);
  });

  it("should accept repeated archive requests when no unarchived workflows remain", async () => {
    execute.mockResolvedValue({ rows: [], rowCount: 0 });
    expectSuccess(await archive());
    expectSuccess(await archive());
    expect(execute).toHaveBeenCalledTimes(4);
    expectTokenArchive(0, [7, 8]);
    expectPasswordArchive(1, [7, 8]);
    expectTokenArchive(2, [7, 8]);
    expectPasswordArchive(3, [7, 8]);
  });

  it.each([
    ["absent identity", {}, 401, "Missing consumer headers on a tracked write"],
    [
      "missing id",
      { "x-consumer-name": "archive-admin" },
      400,
      "Missing consumer Id",
    ],
    [
      "missing nickname",
      { "x-consumer-user-id": "42" },
      400,
      "Missing consumer nickname",
    ],
    [
      "invalid id",
      { ...CONSUMER, "x-consumer-user-id": "invalid" },
      400,
      "Missing consumer Id",
    ],
    [
      "malformed ACL",
      { ...CONSUMER, "x-acl-conditions": "not-json" },
      403,
      "Invalid x-acl-conditions JSON",
    ],
    [
      "unknown ACL field",
      { ...CONSUMER, "x-acl-fields": "unknown" },
      403,
      'Unknown ACL field "unknown"',
    ],
  ])(
    "should reject %s without revoking tokens or archiving passwords",
    async (_name, headers, status, message) => {
      expectError(await archive([7], headers), status, message);
      expect(execute).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["bare ids", [7, 8]],
    ["object ids", [{ id: 7 }, { id: 8 }]],
  ])(
    "should reject an out-of-ACL batch of %s before either write",
    async (_name, rows) => {
      execute.mockResolvedValueOnce({ rows: [{ id: 7 }], rowCount: 1 });
      expectError(
        await archive(rows, {
          ...CONSUMER,
          "x-acl-conditions": JSON.stringify([
            { field: "userId", op: "=", value: 99 },
          ]),
        }),
        403,
        "One or more rows violate ACL conditions",
      );
      expect(execute).toHaveBeenCalledTimes(1);
      expect(execute.mock.calls[0][0]).toMatch(/^\s*SELECT\b/);
      expect(execute.mock.calls[0][1]).toEqual([99, 7, 8]);
    },
  );

  it("should check ACL for all ids before revoking workflows and archiving passwords", async () => {
    execute.mockResolvedValueOnce({
      rows: [{ id: 7 }, { id: 8 }],
      rowCount: 2,
    });
    expectSuccess(
      await archive([7, { id: 8 }], {
        ...CONSUMER,
        "x-acl-conditions": JSON.stringify([
          { field: "userId", op: "=", value: 99 },
        ]),
      }),
    );
    expect(execute).toHaveBeenCalledTimes(3);
    const [sql, args] = execute.mock.calls[0];
    expect(sql).toMatch(/FROM public\.pwd\b/);
    expect(sql).toMatch(/"userId"\s*=\s*\$1/);
    expect(sql).toMatch(/id IN/);
    expect(args).toEqual([99, 7, 8]);
    expectTokenArchive(1, [7, 8]);
    expectPasswordArchive(2, [7, 8]);
  });

  it.each([
    ["missing rows", {}],
    ["empty rows", { rows: [] }],
    ["null rows", { rows: null }],
    ["non-array rows", { rows: { id: 7 } }],
  ])("should reject %s before any write", async (_name, body) => {
    const res = await request(app).post(ENDPOINT).set(CONSUMER).send(body);
    expectError(res, 400, "Missing rows in req.body");
    expect(execute).not.toHaveBeenCalled();
  });

  it.each(
    [
      0,
      -1,
      7.5,
      "invalid",
      "",
      null,
      true,
      [7],
      {},
      { id: null },
      { id: "bad" },
    ].map((invalid) => [invalid]),
  )(
    "should atomically reject invalid id %j before token invalidation",
    async (invalid) => {
      expectError(
        await archive([7, invalid, { id: 8 }]),
        400,
        "Invalid password id for archive",
      );
      expect(execute).not.toHaveBeenCalled();
    },
  );
});
