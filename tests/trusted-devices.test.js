// @ts-check
/**
 * Trusted-device mint / create / verify / list / archive against in-memory SQL.
 */
import { jest } from "@jest/globals";
import { createAuthDbMock } from "./helpers/auth-db-mock.js";

process.env.PWD_SECRET = "test-secret-for-unit-tests-only";

const db = createAuthDbMock();

jest.unstable_mockModule("@dwtechs/antity-pgsql", () => ({
  execute: (sql, params, tx) => db.execute(sql, params, tx),
  getCache: jest.fn(),
  query: { select: jest.fn(), update: jest.fn(), insert: jest.fn() },
}));

const {
  getTrustedDeviceCookieName,
  mintTrustedDeviceToken,
  createTrustedDevice,
  verifyTrustedDevice,
  listTrustedDevices,
  archiveTrustedDevice,
} = await import("../src/services/trusted-devices.js");

describe("trusted devices", () => {
  beforeEach(() => {
    db.reset();
  });

  it("exposes cookie name and mints hashed tokens with TTL", () => {
    expect(getTrustedDeviceCookieName()).toBe("trusted_device");
    const minted = mintTrustedDeviceToken(90);
    expect(minted.plaintext).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(minted.hash.length).toBeGreaterThan(20);
    expect(minted.hash).not.toBe(minted.plaintext);
    expect(minted.expiresAt.getTime()).toBeGreaterThan(
      Date.now() + 80 * 86_400_000,
    );
  });

  it("creates, verifies, lists, then archives a device", async () => {
    const minted = mintTrustedDeviceToken();
    const created = await createTrustedDevice({
      userId: 42,
      deviceTokenHash: minted.hash,
      deviceName: "Laptop",
      ipAddress: "127.0.0.1",
      userAgent: "jest",
      expiresAt: minted.expiresAt,
    });
    expect(created.id).toBeGreaterThan(0);

    expect(await verifyTrustedDevice(42, minted.plaintext)).toBe(true);
    expect(await verifyTrustedDevice(42, "wrong-token")).toBe(false);
    expect(await verifyTrustedDevice(99, minted.plaintext)).toBe(false);
    expect(await verifyTrustedDevice(42, "")).toBe(false);

    const listed = await listTrustedDevices(42);
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      id: created.id,
      deviceName: "Laptop",
    });
    expect(listed[0].expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    expect(await archiveTrustedDevice(42, created.id)).toBe(true);
    expect(await verifyTrustedDevice(42, minted.plaintext)).toBe(false);
    expect(await listTrustedDevices(42)).toEqual([]);
    expect(await archiveTrustedDevice(42, created.id)).toBe(false);
  });

  it("rejects expired devices on verify", async () => {
    const minted = mintTrustedDeviceToken();
    await createTrustedDevice({
      userId: 7,
      deviceTokenHash: minted.hash,
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(await verifyTrustedDevice(7, minted.plaintext)).toBe(false);
  });
});
