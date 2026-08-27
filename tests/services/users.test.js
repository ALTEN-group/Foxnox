/** @jest-environment node */
// @ts-check

import { jest } from "@jest/globals";

const logError = jest.fn();

jest.unstable_mockModule("@dwtechs/winstan", () => ({
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: logError,
    log: jest.fn(),
  },
}));

const { findUserByEmail } = await import("../../src/services/users.js");

const SEARCH_URL = "https://users.example.test/users/search";
const EMAIL = "ada@example.com";

/**
 * @param {number} status
 * @param {unknown} body
 */
function jsonResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: jest.fn().mockResolvedValue(body),
  };
}

describe("findUserByEmail", () => {
  /** @type {string | undefined} */
  let previousUrl;
  /** @type {typeof fetch} */
  let previousFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    previousUrl = process.env.USER_SEARCH_URL;
    previousFetch = globalThis.fetch;
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    if (previousUrl === undefined) {
      delete process.env.USER_SEARCH_URL;
    } else {
      process.env.USER_SEARCH_URL = previousUrl;
    }
    globalThis.fetch = previousFetch;
  });

  it("should return null when USER_SEARCH_URL is missing", async () => {
    delete process.env.USER_SEARCH_URL;

    await expect(findUserByEmail(EMAIL)).resolves.toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledTimes(1);
    expect(String(logError.mock.calls[0][0])).toContain(
      "USER_SEARCH_URL is not configured",
    );
  });

  it("should POST the equals filter payload and return a normalized user", async () => {
    process.env.USER_SEARCH_URL = SEARCH_URL;
    globalThis.fetch = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        rows: [{ id: "7", email: "Ada@Example.com", nickname: "Ada" }],
      }),
    );

    await expect(findUserByEmail(EMAIL)).resolves.toEqual({
      id: 7,
      email: "Ada@Example.com",
      nickname: "Ada",
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(SEARCH_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        filters: {
          email: { value: EMAIL, matchMode: "equals" },
        },
      }),
    });
  });

  it("should omit nickname and fall back to the search email when the row is sparse", async () => {
    process.env.USER_SEARCH_URL = SEARCH_URL;
    globalThis.fetch = jest.fn().mockResolvedValue(
      jsonResponse(200, { rows: [{ id: 3 }] }),
    );

    await expect(findUserByEmail(EMAIL)).resolves.toEqual({
      id: 3,
      email: EMAIL,
      nickname: undefined,
    });
  });

  it("should return null on 404 without logging", async () => {
    process.env.USER_SEARCH_URL = SEARCH_URL;
    globalThis.fetch = jest.fn().mockResolvedValue(jsonResponse(404, {}));

    await expect(findUserByEmail(EMAIL)).resolves.toBeNull();
    expect(logError).not.toHaveBeenCalled();
  });

  it("should return null and log when the search response is not OK", async () => {
    process.env.USER_SEARCH_URL = SEARCH_URL;
    globalThis.fetch = jest.fn().mockResolvedValue(jsonResponse(503, {}));

    await expect(findUserByEmail(EMAIL)).resolves.toBeNull();
    expect(logError).toHaveBeenCalledTimes(1);
    expect(String(logError.mock.calls[0][0])).toBe(
      "USER_SEARCH_URL returned 503",
    );
  });

  it("should return null when the payload has no usable rows", async () => {
    process.env.USER_SEARCH_URL = SEARCH_URL;

    globalThis.fetch = jest.fn().mockResolvedValue(jsonResponse(200, {}));
    await expect(findUserByEmail(EMAIL)).resolves.toBeNull();

    globalThis.fetch = jest.fn().mockResolvedValue(
      jsonResponse(200, { rows: [] }),
    );
    await expect(findUserByEmail(EMAIL)).resolves.toBeNull();

    globalThis.fetch = jest.fn().mockResolvedValue(
      jsonResponse(200, { rows: [{ email: EMAIL }] }),
    );
    await expect(findUserByEmail(EMAIL)).resolves.toBeNull();

    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(200, { rows: [{ id: 0, email: EMAIL }] }));
    await expect(findUserByEmail(EMAIL)).resolves.toBeNull();
  });

  it("should return null when fetch rejects without logging the email", async () => {
    process.env.USER_SEARCH_URL = SEARCH_URL;
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(new Error("network down"));

    await expect(findUserByEmail(EMAIL)).resolves.toBeNull();
    expect(logError).toHaveBeenCalledTimes(1);
    const message = String(logError.mock.calls[0][0]);
    expect(message).toContain("USER_SEARCH_URL request failed");
    expect(message).toContain("network down");
    expect(message).not.toContain(EMAIL);
  });
});
