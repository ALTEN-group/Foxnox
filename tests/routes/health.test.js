// @ts-check
/**
 * Liveness / readiness against the real src/app.js mount (healix before
 * startTimer and every router). Readiness drives Postgres through a mocked
 * pg-pool so CI does not need a live database.
 */
import { jest } from "@jest/globals";
import request from "supertest";

process.env.PWD_SECRET = "test-secret-for-unit-tests-only";
process.env.WEB_PUBLIC_ORIGIN = "http://localhost:8100";
process.env.WEB_PUBLIC_BASE = "/api/pwd/web";

jest.unstable_mockModule("@dwtechs/winstan", () => ({
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  },
}));

const startTimer = jest.fn((_req, _res, next) => next());
jest.unstable_mockModule("@dwtechs/winstan-plugin-express-perf", () => ({
  startTimer,
}));

// antity-pgsql createPool() uses pg-pool — same lever Gatelin health tests use.
const poolQuery = jest.fn();
jest.unstable_mockModule("pg-pool", () => ({
  __esModule: true,
  default: class Pool {
    query(...args) {
      return poolQuery(...args);
    }
  },
}));

describe("GET /pwd/health", () => {
  /** @type {import("express").Express} */
  let app;

  beforeAll(async () => {
    ({ default: app } = await import("../../src/app.js"));
  });

  beforeEach(() => {
    poolQuery.mockReset();
    startTimer.mockClear();
  });

  it("responds without hitting startTimer (mounted before it)", async () => {
    const res = await request(app).get("/pwd/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "ok",
      uptime: expect.any(Number),
      timestamp: expect.any(Number),
    });
    expect(startTimer).not.toHaveBeenCalled();
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("stays 200 with no database, so an outage cannot trigger a restart loop", async () => {
    poolQuery.mockRejectedValue(new Error("connection refused"));

    const res = await request(app).get("/pwd/health");

    expect(res.status).toBe(200);
    expect(poolQuery).not.toHaveBeenCalled();
  });
});

describe("GET /pwd/health/ready", () => {
  /** @type {import("express").Express} */
  let app;

  beforeAll(async () => {
    ({ default: app } = await import("../../src/app.js"));
  });

  beforeEach(() => {
    poolQuery.mockReset();
    startTimer.mockClear();
  });

  it("reports the database unavailable when it cannot be reached", async () => {
    poolQuery.mockRejectedValue(new Error("connection refused"));

    const res = await request(app).get("/pwd/health/ready");

    expect(res.status).toBe(503);
    expect(res.body.status).toBe("unavailable");
    expect(res.body.checks.db.status).toBe("error");
    expect(typeof res.body.checks.db.error).toBe("string");
    expect(res.body.checks.db.error).toContain("connection refused");
  });

  it("reports ready when the database probe succeeds", async () => {
    poolQuery.mockResolvedValue({ rows: [{ "?column?": 1 }] });

    const res = await request(app).get("/pwd/health/ready");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready");
    expect(res.body.checks.db.status).toBe("ok");
    expect(poolQuery).toHaveBeenCalledWith("SELECT 1", []);
  });

  it("is mounted before startTimer", async () => {
    poolQuery.mockResolvedValue({ rows: [] });

    await request(app).get("/pwd/health/ready");

    expect(startTimer).not.toHaveBeenCalled();
  });
});
