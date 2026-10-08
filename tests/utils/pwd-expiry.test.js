/**
 * @jest-environment node
 */

import { earliestPwdExpiry, isValidPwdExpiry } from "../../src/utils/pwd-expiry.js";

describe("earliestPwdExpiry", () => {
  it("is 00:00 UTC of tomorrow's UTC day", () => {
    expect(earliestPwdExpiry(new Date("2026-10-07T23:59:59Z")).toISOString()).toBe(
      "2026-10-08T00:00:00.000Z",
    );
    expect(earliestPwdExpiry(new Date("2026-12-31T00:00:00Z")).toISOString()).toBe(
      "2027-01-01T00:00:00.000Z",
    );
  });
});

describe("isValidPwdExpiry", () => {
  const earliest = earliestPwdExpiry();
  const day = 86_400_000;

  it.each([
    ["now", new Date()],
    ["1 ms before tomorrow", new Date(earliest.getTime() - 1)],
    ["yesterday", new Date(Date.now() - day)],
    ["garbage string", "not a date"],
  ])("rejects %s", (_label, v) => {
    expect(isValidPwdExpiry(v)).toBe(false);
  });

  it.each([
    ["tomorrow 00:00Z", earliest],
    ["tomorrow 00:00Z as ISO string", earliest.toISOString()],
    ["in 30 days", new Date(earliest.getTime() + 30 * day)],
  ])("accepts %s", (_label, v) => {
    expect(isValidPwdExpiry(v)).toBe(true);
  });
});
