// @ts-check
/**
 * POST /pwd/compare — Gatelin login contract: validate payload, load pwd row,
 * run passken compare, strip private fields on the way out.
 */
import { jest } from "@jest/globals";
import request from "supertest";

process.env.PWD_SECRET = "test-secret-for-unit-tests-only";

const get = jest.fn((_req, res, next) => {
  res.locals.rows = [
    {
      id: 1,
      userId: 42,
      pwdHash: "secret-hash-must-not-leak",
      twoFactorSecret: "BASE32SECRET",
      twoFactorEnabled: true,
      pwdExpiry: null,
      lockedUntil: null,
      failedAttempts: 0,
      archived: false,
    },
  ];
  res.locals.total = 1;
  next();
});

const compare = jest.fn((_req, _res, next) => next());
const create = jest.fn((_req, _res, next) => next());
const init = jest.fn();

jest.unstable_mockModule("@dwtechs/passken-express", () => ({
  compare,
  create,
  init,
}));

jest.unstable_mockModule("../../src/entities/pwd.js", () => ({
  default: {
    get,
    addArraySubstack: jest.fn((_req, _res, next) => next()),
    updateArraySubstack: jest.fn((_req, _res, next) => next()),
    archive: jest.fn((_req, _res, next) => next()),
    privateProps: ["pwdHash", "twoFactorSecret"],
    properties: [
      {
        key: "userId",
        type: "integer",
        min: 1,
        max: null,
        operations: ["SELECT", "INSERT"],
        requiredFor: ["POST"],
        isFilterable: true,
        isPrivate: false,
      },
      {
        key: "pwdHash",
        type: "string",
        min: 32,
        max: 255,
        operations: ["SELECT"],
        requiredFor: [],
        isFilterable: false,
        isPrivate: true,
      },
    ],
  },
}));

jest.unstable_mockModule("../../src/middlewares/history.js", () => ({
  default: {
    get: () => (_req, res, next) => {
      res.locals.rows = [];
      res.locals.total = 0;
      next();
    },
  },
}));

// Sibling routers pulled in by the JSON API harness — stub entities.
for (const [file, privateProps] of [
  ["token.js", ["hash"]],
  ["pwd-policy.js", []],
  ["user-trusted-device.js", ["deviceTokenHash"]],
]) {
  jest.unstable_mockModule(`../../src/entities/${file}`, () => ({
    default: {
      get: jest.fn((_req, _res, next) => next()),
      addArraySubstack: jest.fn((_req, _res, next) => next()),
      updateArraySubstack: jest.fn((_req, _res, next) => next()),
      archive: jest.fn((_req, _res, next) => next()),
      privateProps,
      properties: [],
    },
  }));
}

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

describe("POST /pwd/compare", () => {
  beforeEach(() => {
    get.mockClear();
    compare.mockClear().mockImplementation((_req, _res, next) => next());
  });

  it("rejects invalid payloads before loading a pwd row", async () => {
    const res = await request(app)
      .post("/pwd/compare")
      .send({ userId: 0, pwd: "x" });
    expect(res.status).toBe(400);
    expect(get).not.toHaveBeenCalled();
    expect(compare).not.toHaveBeenCalled();
  });

  it("returns the public pwd row and strips secrets", async () => {
    const res = await request(app)
      .post("/pwd/compare")
      .send({ userId: 42, pwd: "correct-horse" });

    expect(res.status).toBe(200);
    expect(get).toHaveBeenCalledTimes(1);
    expect(compare).toHaveBeenCalledTimes(1);
    expect(res.body.rows).toHaveLength(1);
    expect(res.body.rows[0]).toMatchObject({
      id: 1,
      userId: 42,
      twoFactorEnabled: true,
      failedAttempts: 0,
    });
    expect(res.body.rows[0]).not.toHaveProperty("pwdHash");
    expect(res.body.rows[0]).not.toHaveProperty("twoFactorSecret");
    // checkCompareBody installs an internal userId filter for pEnt.get
    expect(get.mock.calls[0][0].body.filters).toEqual({
      userId: { value: 42, matchMode: "=" },
    });
  });

  it("forwards compare failures", async () => {
    compare.mockImplementationOnce((_req, _res, next) =>
      next({ statusCode: 401, message: "Unauthorized" }),
    );

    const res = await request(app)
      .post("/pwd/compare")
      .send({ userId: 42, pwd: "wrong" });

    expect(res.status).toBe(401);
  });

  it("rejects with 403 and skips compare when the account is still locked", async () => {
    get.mockImplementationOnce((_req, res, next) => {
      res.locals.rows = [
        {
          id: 1,
          userId: 42,
          pwdHash: "secret-hash-must-not-leak",
          lockedUntil: new Date(Date.now() + 60_000).toISOString(),
          failedAttempts: 5,
          archived: false,
        },
      ];
      res.locals.total = 1;
      next();
    });

    const res = await request(app)
      .post("/pwd/compare")
      .send({ userId: 42, pwd: "correct-horse" });

    expect(res.status).toBe(403);
    expect(compare).not.toHaveBeenCalled();
  });

  it("lets a lapsed lock through to compare", async () => {
    get.mockImplementationOnce((_req, res, next) => {
      res.locals.rows = [
        {
          id: 1,
          userId: 42,
          pwdHash: "secret-hash-must-not-leak",
          lockedUntil: new Date(Date.now() - 60_000).toISOString(),
          failedAttempts: 5,
          archived: false,
        },
      ];
      res.locals.total = 1;
      next();
    });

    const res = await request(app)
      .post("/pwd/compare")
      .send({ userId: 42, pwd: "correct-horse" });

    expect(res.status).toBe(200);
    expect(compare).toHaveBeenCalledTimes(1);
  });
});
