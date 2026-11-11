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

const { findUserByEmail, findUserRoleIds, isActiveUser } = await import(
  "../../src/services/users.js"
);

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
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        filters: {
          email: { value: EMAIL, matchMode: "equals" },
          archived: { value: false, matchMode: "equals" },
        },
      }),
    });
  });

  it("should omit nickname and fall back to the search email when the row is sparse", async () => {
    process.env.USER_SEARCH_URL = SEARCH_URL;
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(200, { rows: [{ id: 3 }] }));

    await expect(findUserByEmail(EMAIL)).resolves.toEqual({
      id: 3,
      email: EMAIL,
      nickname: undefined,
    });
  });

  it.each([true, false])(
    "should enforce archived=%p locally when upstream ignores the filter",
    async (archived) => {
      process.env.USER_SEARCH_URL = SEARCH_URL;
      globalThis.fetch = jest.fn().mockResolvedValue(
        jsonResponse(200, {
          rows: [{ id: 7, email: EMAIL, archived }],
        }),
      );

      await expect(findUserByEmail(EMAIL)).resolves.toEqual(
        archived ? null : { id: 7, email: EMAIL, nickname: undefined },
      );
      expect(
        JSON.parse(globalThis.fetch.mock.calls[0][1].body).filters,
      ).toEqual({
        email: { value: EMAIL, matchMode: "equals" },
        archived: { value: false, matchMode: "equals" },
      });
    },
  );

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

    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(200, { rows: [] }));
    await expect(findUserByEmail(EMAIL)).resolves.toBeNull();

    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(200, { rows: [{ email: EMAIL }] }));
    await expect(findUserByEmail(EMAIL)).resolves.toBeNull();

    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(200, { rows: [{ id: 0, email: EMAIL }] }),
      );
    await expect(findUserByEmail(EMAIL)).resolves.toBeNull();
  });

  it("should return null when fetch rejects without logging the email", async () => {
    process.env.USER_SEARCH_URL = SEARCH_URL;
    globalThis.fetch = jest.fn().mockRejectedValue(new Error("network down"));

    await expect(findUserByEmail(EMAIL)).resolves.toBeNull();
    expect(logError).toHaveBeenCalledTimes(1);
    const message = String(logError.mock.calls[0][0]);
    expect(message).toContain("USER_SEARCH_URL request failed");
    expect(message).toContain("network down");
    expect(message).not.toContain(EMAIL);
  });
});

describe("isActiveUser", () => {
  let previousUrl;
  let previousFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    previousUrl = process.env.USER_SEARCH_URL;
    previousFetch = globalThis.fetch;
    process.env.USER_SEARCH_URL = SEARCH_URL;
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

  it.each([7, "7"])(
    "should POST all eligibility filters and accept eligible id %p",
    async (id) => {
      globalThis.fetch.mockResolvedValue(
        jsonResponse(200, {
          rows: [{ id, active: true, archived: false }],
        }),
      );

      await expect(isActiveUser(7)).resolves.toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(SEARCH_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          filters: {
            id: { value: 7, matchMode: "equals" },
            active: { value: true, matchMode: "equals" },
            archived: { value: false, matchMode: "equals" },
          },
        }),
      });
    },
  );

  it.each([
    ["null payload", null],
    ["absent rows", {}],
    ["null rows", { rows: null }],
    ["empty rows", { rows: [] }],
    ["non-array rows", { rows: "invalid" }],
    ["null user", { rows: [null] }],
    ["absent id", { rows: [{ active: true, archived: false }] }],
    ["zero id", { rows: [{ id: 0, active: true, archived: false }] }],
    ["different id", { rows: [{ id: 8, active: true, archived: false }] }],
    [
      "invalid id",
      { rows: [{ id: "invalid", active: true, archived: false }] },
    ],
    ["inactive", { rows: [{ id: 7, active: false, archived: false }] }],
    ["archived", { rows: [{ id: 7, active: true, archived: true }] }],
    ["missing active", { rows: [{ id: 7, archived: false }] }],
    ["missing archived", { rows: [{ id: 7, active: true }] }],
    ["null active", { rows: [{ id: 7, active: null, archived: false }] }],
    ["null archived", { rows: [{ id: 7, active: true, archived: null }] }],
    ["string active", { rows: [{ id: 7, active: "true", archived: false }] }],
    ["numeric active", { rows: [{ id: 7, active: 1, archived: false }] }],
    ["string archived", { rows: [{ id: 7, active: true, archived: "false" }] }],
    ["numeric archived", { rows: [{ id: 7, active: true, archived: 0 }] }],
    [
      "eligible user only after a mismatched first row",
      {
        rows: [
          { id: 8, active: true, archived: false },
          { id: 7, active: true, archived: false },
        ],
      },
    ],
  ])("should fail closed for %s", async (_label, payload) => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, payload));

    await expect(isActiveUser(7)).resolves.toBe(false);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("should fail closed without a configured search URL", async () => {
    delete process.env.USER_SEARCH_URL;

    await expect(isActiveUser(7)).resolves.toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it.each([404, 401, 503])(
    "should fail closed on HTTP %i without reading the body",
    async (status) => {
      const response = jsonResponse(status, {
        rows: [{ id: 7, active: true, archived: false }],
      });
      globalThis.fetch.mockResolvedValue(response);

      await expect(isActiveUser(7)).resolves.toBe(false);
      expect(response.json).not.toHaveBeenCalled();
      expect(logError).toHaveBeenCalledTimes(status === 404 ? 0 : 1);
    },
  );

  it.each(["network", "JSON"])(
    "should fail closed on a %s error",
    async (failure) => {
      const error = new Error(`${failure} failed`);
      if (failure === "network") {
        globalThis.fetch.mockRejectedValue(error);
      } else {
        const response = jsonResponse(200, null);
        response.json.mockRejectedValue(error);
        globalThis.fetch.mockResolvedValue(response);
      }

      await expect(isActiveUser(7)).resolves.toBe(false);
      expect(logError).toHaveBeenCalledWith(
        `USER_SEARCH_URL request failed: ${error.message}`,
      );
    },
  );
});

describe("findUserRoleIds", () => {
  /** @type {string | undefined} */
  let previousUrl;
  /** @type {typeof fetch} */
  let previousFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    previousUrl = process.env.USER_SEARCH_URL;
    previousFetch = globalThis.fetch;
    process.env.USER_SEARCH_URL = SEARCH_URL;
  });

  afterEach(() => {
    if (previousUrl === undefined) {
      delete process.env.USER_SEARCH_URL;
    } else {
      process.env.USER_SEARCH_URL = previousUrl;
    }
    globalThis.fetch = previousFetch;
  });

  it("should search by id and return the numeric role ids", async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(200, { rows: [{ id: 7, roles: [2, "3"] }] }),
      );

    await expect(findUserRoleIds(7)).resolves.toEqual([2, 3]);
    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body)).toEqual({
      filters: { id: { value: 7, matchMode: "equals" } },
    });
  });

  it("should return an empty list when the user or its roles are unknown", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(jsonResponse(404, {}));
    await expect(findUserRoleIds(7)).resolves.toEqual([]);

    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(200, { rows: [{ id: 7 }] }));
    await expect(findUserRoleIds(7)).resolves.toEqual([]);
  });
});
