// @ts-check
/**
 * Gatelin mid-login contract: challenge mint, trusted-device verify,
 * login-ticket redeem, plus request validators — no Postgres.
 */
import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

process.env.PWD_SECRET = "test-secret-for-unit-tests-only";
process.env.WEB_PUBLIC_ORIGIN = "http://localhost:8100";
process.env.WEB_PUBLIC_BASE = "/api/pwd/web";

const createLoginChallenge = jest.fn();
const verifyTrustedDevice = jest.fn();
const redeemLoginResumeTicket = jest.fn();

jest.unstable_mockModule("../../src/services/challenge.js", () => ({
  CHALLENGE_KINDS: Object.freeze({
    "2fa": { typeName: "2FA challenge", path: "/2fa/verify" },
    "expired-password": {
      typeName: "Expired password challenge",
      path: "/password/expired",
    },
    "trusted-device": {
      typeName: "Trusted device challenge",
      path: "/trusted-devices/prompt",
    },
  }),
  isChallengeKind: (kind) =>
    ["2fa", "expired-password", "trusted-device"].includes(kind),
  getChallengeSpec: jest.fn(),
  createLoginChallenge,
  findValidLoginChallenge: jest.fn(),
  consumeLoginChallenge: jest.fn(),
}));

jest.unstable_mockModule("../../src/services/trusted-devices.js", () => ({
  verifyTrustedDevice,
  getTrustedDeviceCookieName: () => "trusted_device",
  mintTrustedDeviceToken: jest.fn(),
  createTrustedDevice: jest.fn(),
  listTrustedDevices: jest.fn(),
  archiveTrustedDevice: jest.fn(),
}));

jest.unstable_mockModule("../../src/web/login-resume.js", () => ({
  redeemLoginResumeTicket,
  buildLoginResumeUrl: jest.fn(),
  getLoginResumeBaseUrl: jest.fn(),
}));

const { checkChallengeBody } = await import(
  "../../src/middlewares/validators/check-challenge.js"
);
const { checkCompareBody } = await import(
  "../../src/middlewares/validators/check-compare.js"
);
const challengeRouter = (await import("../../src/routes/challenge.js")).default;
const trustedVerifyRouter = (
  await import("../../src/routes/trusted-device-verify.js")
).default;
const loginTicketRouter = (await import("../../src/routes/login-ticket.js"))
  .default;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/pwd/challenges", challengeRouter);
  app.use("/pwd/trusted-devices/verify", trustedVerifyRouter);
  app.use("/pwd/login-tickets", loginTicketRouter);
  app.use((err, _req, res, _next) => {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message || "error" });
  });
  return app;
}

const app = buildApp();

beforeEach(() => {
  jest.clearAllMocks();
  createLoginChallenge.mockResolvedValue({
    kind: "2fa",
    challenge: "chal-abc",
    path: "/2fa/verify",
    url: "http://localhost:8100/api/pwd/web/2fa/verify?challenge=chal-abc",
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
  });
  verifyTrustedDevice.mockResolvedValue(true);
  redeemLoginResumeTicket.mockResolvedValue({ userId: 44 });
});

describe("POST /pwd/challenges", () => {
  it("mints a challenge for a valid kind", async () => {
    const res = await request(app)
      .post("/pwd/challenges")
      .send({ userId: 12, kind: "2fa" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      kind: "2fa",
      challenge: "chal-abc",
      path: "/2fa/verify",
    });
    expect(createLoginChallenge).toHaveBeenCalledWith({
      userId: 12,
      kind: "2fa",
    });
  });

  it("rejects invalid payloads", async () => {
    const badUser = await request(app)
      .post("/pwd/challenges")
      .send({ userId: 0, kind: "2fa" });
    expect(badUser.status).toBe(400);

    const badKind = await request(app)
      .post("/pwd/challenges")
      .send({ userId: 1, kind: "nope" });
    expect(badKind.status).toBe(400);
  });
});

describe("POST /pwd/trusted-devices/verify", () => {
  it("returns trusted flag", async () => {
    const res = await request(app)
      .post("/pwd/trusted-devices/verify")
      .send({ userId: 9, deviceToken: "tok" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ trusted: true });
    expect(verifyTrustedDevice).toHaveBeenCalledWith(9, "tok");
  });

  it("rejects invalid payloads", async () => {
    const res = await request(app)
      .post("/pwd/trusted-devices/verify")
      .send({ userId: 9 });
    expect(res.status).toBe(400);
  });
});

describe("POST /pwd/login-tickets/redeem", () => {
  it("redeems a valid ticket", async () => {
    const res = await request(app)
      .post("/pwd/login-tickets/redeem")
      .send({ ticket: "abc" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: 44 });
  });

  it("rejects missing or invalid tickets", async () => {
    expect(
      (await request(app).post("/pwd/login-tickets/redeem").send({})).status,
    ).toBe(400);

    redeemLoginResumeTicket.mockResolvedValue(null);
    const res = await request(app)
      .post("/pwd/login-tickets/redeem")
      .send({ ticket: "gone" });
    expect(res.status).toBe(400);
  });
});

describe("request validators", () => {
  function run(mw, body) {
    return new Promise((resolve) => {
      const req = { body };
      mw(req, {}, (err) => resolve({ err, body: req.body }));
    });
  }

  it("checkChallengeBody normalizes valid input", async () => {
    const { err, body } = await run(checkChallengeBody, {
      userId: "5",
      kind: " trusted-device ",
    });
    expect(err).toBeUndefined();
    expect(body).toEqual({ userId: 5, kind: "trusted-device" });
  });

  it("checkCompareBody builds userId filters", async () => {
    const { err, body } = await run(checkCompareBody, {
      userId: 3,
      pwd: "secret",
    });
    expect(err).toBeUndefined();
    expect(body.filters).toEqual({
      userId: { value: 3, matchMode: "=" },
    });

    const bad = await run(checkCompareBody, { userId: 3 });
    expect(bad.err).toMatchObject({ statusCode: 400 });
  });
});
