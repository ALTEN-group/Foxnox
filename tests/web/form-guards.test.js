/** @jest-environment node */
// @ts-check

import { jest } from "@jest/globals";
import { isSuspiciousForm, isValidEmail } from "../../src/web/form-guards.js";

const NOW = 1_700_000_000_000;
const MIN_AGE_MS = 1500;
const MAX_AGE_MS = 1000 * 60 * 60;

/**
 * @param {Record<string, unknown>} body
 */
function req(body) {
  return /** @type {import("express").Request} */ ({ body });
}

describe("isSuspiciousForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should reject a filled honeypot field", () => {
    expect(
      isSuspiciousForm(
        req({ website: "http://bot.example", rendered_at: NOW - MIN_AGE_MS }),
      ),
    ).toBe(true);
    expect(
      isSuspiciousForm(req({ website: "  x  ", rendered_at: NOW - MIN_AGE_MS })),
    ).toBe(true);
  });

  it("should reject a missing or invalid rendered_at timestamp", () => {
    expect(isSuspiciousForm(req({}))).toBe(true);
    expect(isSuspiciousForm(req({ rendered_at: 0 }))).toBe(true);
    expect(isSuspiciousForm(req({ rendered_at: -1 }))).toBe(true);
    expect(isSuspiciousForm(req({ rendered_at: "not-a-number" }))).toBe(true);
    expect(isSuspiciousForm(req({ rendered_at: Number.NaN }))).toBe(true);
    expect(isSuspiciousForm(req({ rendered_at: Number.POSITIVE_INFINITY }))).toBe(
      true,
    );
  });

  it("should reject submissions that are too fast", () => {
    expect(isSuspiciousForm(req({ rendered_at: NOW }))).toBe(true);
    expect(isSuspiciousForm(req({ rendered_at: NOW - (MIN_AGE_MS - 1) }))).toBe(
      true,
    );
  });

  it("should reject submissions that are too old", () => {
    expect(
      isSuspiciousForm(req({ rendered_at: NOW - (MAX_AGE_MS + 1) })),
    ).toBe(true);
  });

  it("should accept submissions within the allowed timing window", () => {
    expect(isSuspiciousForm(req({ rendered_at: NOW - MIN_AGE_MS }))).toBe(false);
    expect(isSuspiciousForm(req({ rendered_at: NOW - MAX_AGE_MS }))).toBe(false);
    expect(
      isSuspiciousForm(
        req({ website: "   ", rendered_at: String(NOW - 30_000) }),
      ),
    ).toBe(false);
  });
});

describe("isValidEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should accept a valid email and trim surrounding whitespace", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("  user@example.com  ")).toBe(true);
  });

  it("should reject non-string values and invalid formats", () => {
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(1)).toBe(false);
    expect(isValidEmail({})).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("user@example")).toBe(false);
    expect(isValidEmail("user example.com")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
  });

  it("should reject emails longer than 254 characters", () => {
    const local = "a".repeat(64);
    const domain = `${"b".repeat(186)}.com`;
    const overLimit = `${local}@${domain}`;
    expect(overLimit.length).toBe(255);
    expect(isValidEmail(overLimit)).toBe(false);

    const atLimit = `${"a".repeat(64)}@${"b".repeat(185)}.com`;
    expect(atLimit.length).toBe(254);
    expect(isValidEmail(atLimit)).toBe(true);
  });
});
