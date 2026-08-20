// @ts-check
/**
 * Parameterized CRUD wiring for Foxnox JSON resources — mirrors Gatelin's
 * tests/routes/crud-resources.test.js. Entities are stubbed; we assert that
 * each HTTP verb reaches the right entity method and response shape.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jest } from "@jest/globals";
import request from "supertest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.PWD_SECRET = "test-secret-for-unit-tests-only";

/** @typedef {{ name: string, mount: string, entityFile: string, historyTable: string, privateProps: string[] }} Resource */

/** @type {Resource[]} */
const RESOURCES = [
  {
    name: "pwd",
    mount: "/pwd",
    entityFile: "pwd.js",
    historyTable: "pwd",
    privateProps: ["pwdHash", "twoFactorSecret"],
  },
  {
    name: "tokens",
    mount: "/pwd/tokens",
    entityFile: "token.js",
    historyTable: "token",
    privateProps: ["hash"],
  },
  {
    name: "policies",
    mount: "/pwd/policies",
    entityFile: "pwd-policy.js",
    historyTable: "pwd_policy",
    privateProps: [],
  },
  {
    name: "trusted-devices",
    mount: "/pwd/trusted-devices",
    entityFile: "user-trusted-device.js",
    historyTable: "user_trusted_device",
    privateProps: ["deviceTokenHash"],
  },
];

/** @type {Record<string, import("@jest/globals").Mock>} */
const entityGets = {};
/** @type {Record<string, import("@jest/globals").Mock>} */
const entityAdds = {};
/** @type {Record<string, import("@jest/globals").Mock>} */
const entityUpdates = {};
/** @type {Record<string, import("@jest/globals").Mock>} */
const entityArchives = {};
/** @type {Record<string, import("@jest/globals").Mock>} */
const historyMiddlewares = {};

for (const resource of RESOURCES) {
  const tag = resource.name;
  const get = jest.fn((_req, res, next) => {
    res.locals.rows = [
      {
        id: 1,
        entity: tag,
        pwdHash: "secret",
        twoFactorSecret: "otp",
        hash: "tok-hash",
        deviceTokenHash: "dev-hash",
      },
    ];
    res.locals.total = 1;
    next();
  });
  const addArraySubstack = jest.fn((req, res, next) => {
    res.locals.rows = req.body.rows ?? [{ id: 1, entity: tag }];
    res.locals.total = res.locals.rows.length;
    next();
  });
  const updateArraySubstack = jest.fn((req, res, next) => {
    res.locals.rows = req.body.rows ?? [];
    res.locals.total = res.locals.rows.length;
    next();
  });
  const archive = jest.fn((req, res, next) => {
    res.locals.rows = req.body.rows ?? [];
    res.locals.total = res.locals.rows.length;
    next();
  });

  entityGets[tag] = get;
  entityAdds[tag] = addArraySubstack;
  entityUpdates[tag] = updateArraySubstack;
  entityArchives[tag] = archive;

  jest.unstable_mockModule(
    path.join(__dirname, `../../src/entities/${resource.entityFile}`),
    () => ({
      default: {
        get,
        addArraySubstack,
        updateArraySubstack,
        archive,
        privateProps: resource.privateProps,
        properties: [
          {
            key: "id",
            type: "integer",
            min: null,
            max: null,
            operations: ["SELECT"],
            requiredFor: [],
            isFilterable: true,
            isPrivate: false,
          },
          {
            key: "secretField",
            type: "string",
            min: null,
            max: null,
            operations: ["SELECT"],
            requiredFor: [],
            isFilterable: false,
            isPrivate: true,
          },
        ],
      },
    }),
  );
}

const historyGet = jest.fn((tableName) => {
  const mw = jest.fn((_req, res, next) => {
    res.locals.rows = [
      {
        id: 1,
        operation: "UPDATE",
        record: {
          id: 1,
          table: tableName,
          pwdHash: "secret",
          twoFactorSecret: "otp",
          hash: "tok-hash",
          deviceTokenHash: "dev-hash",
        },
      },
    ];
    res.locals.total = 1;
    next();
  });
  historyMiddlewares[tableName] = mw;
  return mw;
});

jest.unstable_mockModule(
  path.join(__dirname, "../../src/middlewares/history.js"),
  () => ({
    default: { get: historyGet },
  }),
);

jest.unstable_mockModule("@dwtechs/passken-express", () => ({
  compare: jest.fn((_req, _res, next) => next()),
  create: jest.fn((_req, _res, next) => next()),
}));

jest.unstable_mockModule("../../src/services/challenge.js", () => ({
  CHALLENGE_KINDS: {},
  isChallengeKind: () => false,
  getChallengeSpec: jest.fn(),
  createLoginChallenge: jest.fn(),
  findValidLoginChallenge: jest.fn(),
  consumeLoginChallenge: jest.fn(),
}));

jest.unstable_mockModule("../../src/services/trusted-devices.js", () => ({
  verifyTrustedDevice: jest.fn(),
  getTrustedDeviceCookieName: () => "trusted_device",
  mintTrustedDeviceToken: jest.fn(),
  createTrustedDevice: jest.fn(),
  listTrustedDevices: jest.fn(),
  archiveTrustedDevice: jest.fn(),
}));

jest.unstable_mockModule("../../src/web/login-resume.js", () => ({
  redeemLoginResumeTicket: jest.fn(),
  buildLoginResumeUrl: jest.fn(),
  getLoginResumeBaseUrl: jest.fn(),
}));

const { createJsonApiApp } = await import("../helpers/json-api-app.js");
const app = await createJsonApiApp();

describe.each(RESOURCES)(
  "POST $mount/search ($name)",
  ({ name, mount, privateProps }) => {
    beforeEach(() => {
      entityGets[name].mockClear();
    });

    it("routes to its own entity and strips its private fields", async () => {
      const res = await request(app).post(`${mount}/search`).send({});
      expect(res.status).toBe(200);
      expect(res.body.rows[0].entity).toBe(name);
      expect(entityGets[name]).toHaveBeenCalledTimes(1);
      for (const key of privateProps) {
        expect(res.body.rows[0]).not.toHaveProperty(key);
      }
    });
  },
);

describe.each(RESOURCES)(
  "GET $mount/:id/history ($name)",
  ({ name, mount, historyTable, privateProps }) => {
    beforeEach(() => {
      historyMiddlewares[historyTable].mockClear();
    });

    it("routes to history for its table and strips private fields from the record snapshot", async () => {
      const res = await request(app).get(`${mount}/1/history`);
      expect(res.status).toBe(200);
      expect(res.body.rows[0].record.table).toBe(historyTable);
      expect(historyMiddlewares[historyTable]).toHaveBeenCalledTimes(1);
      expect(entityGets[name]).not.toHaveBeenCalled();
      for (const key of privateProps) {
        expect(res.body.rows[0].record).not.toHaveProperty(key);
      }
    });
  },
);

describe.each(RESOURCES)("POST $mount (add) ($name)", ({ name, mount }) => {
  beforeEach(() => {
    entityAdds[name].mockClear();
  });

  it("routes to addArraySubstack", async () => {
    const res = await request(app)
      .post(`${mount}/`)
      .send({ rows: [{ id: 9, entity: name }] });
    expect(res.status).toBe(200);
    expect(res.body.rows[0].entity).toBe(name);
    expect(entityAdds[name]).toHaveBeenCalledTimes(1);
  });
});

describe.each(RESOURCES)("PUT $mount (update) ($name)", ({ name, mount }) => {
  beforeEach(() => {
    entityUpdates[name].mockClear();
  });

  it("routes to updateArraySubstack", async () => {
    const res = await request(app)
      .put(`${mount}/`)
      .send({ rows: [{ id: 1, entity: name }] });
    expect(res.status).toBe(200);
    expect(entityUpdates[name]).toHaveBeenCalledTimes(1);
  });
});

describe.each(RESOURCES)("POST $mount/archive ($name)", ({ name, mount }) => {
  beforeEach(() => {
    entityArchives[name].mockClear();
  });

  it("routes to archive", async () => {
    const res = await request(app)
      .post(`${mount}/archive`)
      .send({ rows: [{ id: 1 }] });
    expect(res.status).toBe(200);
    expect(entityArchives[name]).toHaveBeenCalledTimes(1);
  });
});

describe.each(RESOURCES)("GET $mount/schema ($name)", ({ name, mount }) => {
  it("returns non-private property projections", async () => {
    const res = await request(app).get(`${mount}/schema`);
    expect(res.status).toBe(200);
    expect(res.body.rows.every((r) => r.key !== "secretField")).toBe(true);
    expect(res.body.rows.some((r) => r.key === "id")).toBe(true);
    expect(entityGets[name]).not.toHaveBeenCalled();
  });
});

describe("Gatelin ACL header wiring", () => {
  it("forces x-acl-conditions into entity search filters", async () => {
    entityGets.policies.mockClear();

    const res = await request(app)
      .post("/pwd/policies/search")
      .set(
        "x-acl-conditions",
        JSON.stringify([{ field: "id", op: ">", value: 2 }]),
      )
      .send({ operator: "OR" });

    expect(res.status).toBe(200);
    const [req] = entityGets.policies.mock.calls[0];
    expect(req.body.operator).toBe("AND");
    expect(req.body.filters.id).toEqual([
      { value: 2, matchMode: ">", operator: "AND" },
    ]);
  });

  it("filters update rows using x-acl-fields before the entity runs", async () => {
    entityUpdates.policies.mockClear();

    const res = await request(app)
      .put("/pwd/policies")
      .set("x-acl-fields", "")
      .send({ rows: [{ id: 1, entity: "policies" }] });

    expect(res.status).toBe(200);
    const [req] = entityUpdates.policies.mock.calls[0];
    expect(req.body.rows).toEqual([{ id: 1 }]);
  });
});

describe("mount order", () => {
  it("keeps /pwd/policies off the catch-all /pwd/ sendPwd path", async () => {
    entityGets.policies.mockClear();
    entityGets.pwd.mockClear();

    const res = await request(app).post("/pwd/policies/search").send({});
    expect(res.status).toBe(200);
    expect(entityGets.policies).toHaveBeenCalledTimes(1);
    expect(entityGets.pwd).not.toHaveBeenCalled();
  });

  it("keeps /pwd/tokens off the catch-all /pwd/ path", async () => {
    entityGets.tokens.mockClear();
    entityGets.pwd.mockClear();

    const res = await request(app).post("/pwd/tokens/search").send({});
    expect(res.status).toBe(200);
    expect(entityGets.tokens).toHaveBeenCalledTimes(1);
    expect(entityGets.pwd).not.toHaveBeenCalled();
  });
});
