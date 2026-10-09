/**
 * @jest-environment node
 */

import { jest } from "@jest/globals";
import brandingEnt from "../../src/entities/branding.js";
import pwdEnt from "../../src/entities/pwd.js";
import pwdPolicyEnt from "../../src/entities/pwd-policy.js";
import tokenEnt from "../../src/entities/token.js";
import userDeviceEnt from "../../src/entities/user-device.js";

const AUDIT_DATES = ["archivedAt", "createdAt", "updatedAt"];

describe("pwd system-managed fields", () => {
  it.each([
    "lockedUntil",
    "lastLoginAt",
    "failedAttempts",
    "pwdUpdatedAt",
    "twoFactorEnabled",
  ])(
    "%s is readOnly",
    (key) => {
      expect(pwdEnt.properties.find((p) => p.key === key).readOnly).toBe(true);
    },
  );
});

describe.each([
  ["pwd", pwdEnt],
  ["pwd_policy", pwdPolicyEnt],
  ["token", tokenEnt],
  ["user_device", userDeviceEnt],
  ["branding", brandingEnt],
])("%s audit dates", (_name, ent) => {
  it.each(AUDIT_DATES)("%s is a readOnly date", (key) => {
    const p = ent.properties.find((prop) => prop.key === key);
    expect(p.type).toBe("date");
    expect(p.readOnly).toBe(true);
  });

  it("PUT round-trip with ISO-string audit dates is stripped, not rejected", () => {
    const iso = "2026-10-08T19:45:09.117Z";
    const row = { id: 3, archivedAt: iso, createdAt: iso, updatedAt: iso };
    const req = { method: "PUT", body: { rows: [row] } };
    const next = jest.fn();

    ent.normalizeArray(req, {}, jest.fn());
    ent.validateArray(req, {}, next);

    // other required fields are absent here: only audit dates must not be the cause
    const err = next.mock.calls[0][0];
    expect(err?.message ?? "").not.toMatch(/archivedAt|createdAt|updatedAt/);
    for (const key of AUDIT_DATES) expect(row).not.toHaveProperty(key);
  });
});
