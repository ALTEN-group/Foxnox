/**
 * @jest-environment node
 */
import { jest } from "@jest/globals";

const execute = jest.fn();
jest.unstable_mockModule("@dwtechs/antity-pgsql", () => ({ execute }));

const { enforceAcl } = await import("../../src/middlewares/acl.js");

const select = jest.fn(() => ({ query: "SELECT acl", args: [1] }));
const entity = {
  properties: [
    { key: "id", type: "integer", isFilterable: true },
    { key: "userId", type: "integer", isFilterable: true },
    { key: "name", type: "string", isFilterable: true },
    { key: "secret", type: "string", isFilterable: false },
  ],
  query: { select },
};

function run(mode, { headers = {}, body = {}, params = {}, rows = [] } = {}) {
  const req = { headers, body, params };
  const res = { locals: { dbClient: null } };
  execute.mockResolvedValue({ rows });
  return new Promise((resolve) => {
    enforceAcl(entity, mode)(req, res, (err) => resolve({ err, req, res }));
  });
}

beforeEach(() => {
  execute.mockReset();
  select.mockClear();
});

describe("Foxnox Gatelin ACL enforcement", () => {
  it("forces search conditions into an AND filter", async () => {
    const { err, req } = await run("search", {
      headers: {
        "x-acl-conditions": JSON.stringify([
          { field: "userId", op: "=", value: 7 },
          { field: "id", op: ">", value: 3 },
        ]),
      },
      body: {
        operator: "OR",
        filters: {
          name: { value: "admin", matchMode: "contains" },
          userId: { value: 999, matchMode: "=", operator: "OR" },
        },
      },
    });

    expect(err).toBeUndefined();
    expect(req.body.operator).toBe("AND");
    expect(req.body.filters.name).toEqual({
      value: "admin",
      matchMode: "contains",
    });
    expect(req.body.filters.userId).toEqual([
      { value: 999, matchMode: "=", operator: "AND" },
      { value: 7, matchMode: "=", operator: "AND" },
    ]);
    expect(req.body.filters.id).toEqual([
      { value: 3, matchMode: ">", operator: "AND" },
    ]);
  });

  it("filters insert fields then injects an equality partition key", async () => {
    const { err, req } = await run("insert", {
      headers: {
        "x-acl-fields": "name",
        "x-acl-conditions": JSON.stringify([
          { field: "userId", op: "=", value: 7 },
        ]),
      },
      body: { rows: [{ name: "device", secret: "drop", userId: 99 }] },
    });

    expect(err).toBeUndefined();
    expect(req.body.rows).toEqual([{ name: "device", userId: 7 }]);
  });

  it("normalizes string condition values to the entity property type", async () => {
    const { err, req } = await run("insert", {
      headers: {
        "x-acl-conditions": JSON.stringify([
          { field: "userId", op: "=", value: "7" },
        ]),
      },
      body: { rows: [{ name: "device", userId: 7 }] },
    });

    expect(err).toBeUndefined();
    expect(req.body.rows[0].userId).toBe(7);
  });

  it("rejects inserts that violate non-equality conditions", async () => {
    const { err } = await run("insert", {
      headers: {
        "x-acl-conditions": JSON.stringify([
          { field: "id", op: ">", value: 10 },
        ]),
      },
      body: { rows: [{ id: 2, name: "small" }] },
    });

    expect(err).toMatchObject({
      statusCode: 403,
      message: "Row violates ACL conditions",
    });
  });

  it("preflights update IDs against conditions and filters write fields", async () => {
    const { err, req } = await run("existing", {
      headers: {
        "x-acl-fields": "name",
        "x-acl-conditions": JSON.stringify([
          { field: "userId", op: "=", value: 7 },
        ]),
      },
      body: { rows: [{ id: 2, name: "allowed", secret: "drop" }] },
      rows: [{ id: 2 }],
    });

    expect(err).toBeUndefined();
    expect(req.body.rows).toEqual([{ id: 2, name: "allowed" }]);
    expect(select).toHaveBeenCalledWith(
      0,
      null,
      null,
      null,
      {
        userId: [{ value: 7, matchMode: "=", operator: "AND" }],
        id: { value: [2], matchMode: "in" },
      },
      "AND",
    );
    expect(execute).toHaveBeenCalledWith("SELECT acl", [1], null);
  });

  it("rejects update or history IDs outside the ACL partition", async () => {
    const { err } = await run("existing", {
      headers: {
        "x-acl-conditions": JSON.stringify([
          { field: "userId", op: "=", value: 7 },
        ]),
      },
      params: { id: "8" },
      rows: [],
    });

    expect(err).toMatchObject({
      statusCode: 403,
      message: "One or more rows violate ACL conditions",
    });
  });

  it("rejects updates that move a row outside its ACL partition", async () => {
    const { err } = await run("existing", {
      headers: {
        "x-acl-conditions": JSON.stringify([
          { field: "userId", op: "=", value: 7 },
        ]),
      },
      body: { rows: [{ id: 2, userId: 8 }] },
      rows: [{ id: 2 }],
    });

    expect(err).toMatchObject({
      statusCode: 403,
      message: "Update violates ACL conditions",
    });
  });

  it.each([
    ["malformed JSON", "{"],
    [
      "unknown field",
      JSON.stringify([{ field: "missing", op: "=", value: 1 }]),
    ],
    [
      "non-filterable field",
      JSON.stringify([{ field: "secret", op: "=", value: "x" }]),
    ],
    [
      "unsupported operator",
      JSON.stringify([{ field: "id", op: "LIKE", value: 1 }]),
    ],
  ])("fails closed for %s conditions", async (_name, header) => {
    const { err } = await run("search", {
      headers: { "x-acl-conditions": header },
    });
    expect(err).toMatchObject({ statusCode: 403 });
  });

  it("leaves internal/public requests unrestricted when ACL headers are absent", async () => {
    const body = { rows: [{ id: 2, name: "ok", secret: "internal" }] };
    const { err, req } = await run("existing", { body });

    expect(err).toBeUndefined();
    expect(req.body).toEqual(body);
    expect(execute).not.toHaveBeenCalled();
  });

  it("maps Gatelin consumer headers for database audit columns", async () => {
    const { err, res } = await run("insert", {
      headers: {
        "x-consumer-user-id": "42",
        "x-consumer-name": "alice",
      },
      body: { rows: [{ name: "device" }] },
    });

    expect(err).toBeUndefined();
    expect(res.locals.consumer).toEqual({ userId: 42, nickname: "alice" });
  });

  it("fails closed when consumer headers are malformed or incomplete", async () => {
    const { err } = await run("search", {
      headers: { "x-consumer-user-id": "42" },
    });

    expect(err).toMatchObject({
      statusCode: 403,
      message: "Invalid consumer headers",
    });
  });
});
