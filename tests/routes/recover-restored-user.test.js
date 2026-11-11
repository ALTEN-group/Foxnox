/** @jest-environment node */

import { compare, encrypt } from "@dwtechs/hashitaka";
import { jest } from "@jest/globals";
import request from "supertest";

process.env.PWD_SECRET = "recovery-http-regression-test-only";
process.env.USER_SEARCH_URL = "http://users.invalid/search";
process.env.WEB_PUBLIC_ORIGIN = "http://localhost:8100";
process.env.WEB_PUBLIC_BASE = "/api/foxnox/web";

// Real entities, SQL generation, token validation and password hashing.
// The pool is the only database replacement; unexpected queries fail closed.
const query = jest.fn();
jest.unstable_mockModule("pg-pool", () => ({
  default: class {
    query(...args) {
      return query(...args);
    }
  },
}));

const { default: app } = await import("../../src/app.js");
const { hashToken } = await import("../../src/services/token-crypto.js");
const { csrfForm } = await import("../helpers/form.js");
const BASE = "/foxnox/web";
const LINK = "valid-reset-link";
const OLD = "PreviousPassword123!";
const NEXT = "ReplacementPassword456!";
const POLICY = {
  id: 1,
  length: 12,
  number: true,
  symbol: true,
  lowerCase: true,
  upperCase: true,
  expiryDays: 30,
  roleIds: [],
};
let passwords;
let token;
let user;
let oldHash;

function postReset(fields = {}) {
  const { cookie, body } = csrfForm({
    token: LINK,
    password: NEXT,
    confirm: NEXT,
    ...fields,
  });
  return request(app)
    .post(`${BASE}/recover/reset`)
    .set("Cookie", cookie)
    .type("form")
    .send(body);
}

function expectHtml(res, status, message) {
  expect(res.status).toBe(status);
  expect(res.headers["content-type"]).toMatch(/text\/html/);
  expect(res.text).toContain(message);
  expect(res.text).not.toContain(oldHash);
  expect(res.text).not.toContain("JBSWY3DPEHPK3PXP");
}

function writes(table) {
  return query.mock.calls.filter(([sql]) =>
    new RegExp(`^UPDATE (?:public\\.)?${table}\\b`).test(sql.trim()),
  );
}

// Small stateful boundary fixture, not a SQL engine. Check query contracts
// before applying writes so missing restoration guards cannot pass silently.
async function database(sql, args = []) {
  const text = sql.replace(/\s+/g, " ").trim();
  if (text.includes("FROM token_type")) {
    const typeId = {
      "Password reset": 3,
      "Expired password challenge": 4,
    }[args[0]];
    expect(typeId).toBeDefined();
    return {
      rows: [{ id: typeId, name: args[0], ttl: 30, maxAttempts: 3 }],
      rowCount: 1,
    };
  }
  if (text.includes("FROM token t")) {
    expect(text).toContain('t."verifiedAt" IS NULL');
    expect(text).toContain('t."expiresAt" > NOW()');
    expect(text).toContain("t.archived IS NOT TRUE");
    const valid =
      args[0] === token.typeId &&
      args[1] === token.hash &&
      !token.archived &&
      !token.verifiedAt &&
      token.expiresAt > new Date();
    return { rows: valid ? [{ ...token }] : [], rowCount: valid ? 1 : 0 };
  }
  if (/FROM public\.pwd_policy\b/.test(text)) {
    return { rows: [POLICY], rowCount: 1 };
  }
  if (text.startsWith("SELECT") && /FROM public\.pwd\b/.test(text)) {
    expect(text).toMatch(/"userId"\s*=\s*\$1/);
    expect(text).toMatch(/archived\s*=\s*\$2/);
    const descending = /ORDER BY id DESC/.test(text);
    const rows = passwords
      .filter((row) => row.userId === args[0] && row.archived === args[1])
      .sort((a, b) => (descending ? b.id - a.id : a.id - b.id));
    return {
      rows: rows.slice(0, 1).map((row) => ({ ...row })),
      rowCount: Math.min(rows.length, 1),
    };
  }
  if (text.startsWith("UPDATE public.pwd SET")) {
    const row = passwords.find((item) => item.id === args[0]);
    if (!row) return { rows: [], rowCount: 0 };
    const restoring = text.includes("AND archived = TRUE");
    if (restoring) {
      const userId = args.at(-1);
      expect(text).toContain(`"userId" = $${args.length} AND archived = TRUE`);
      expect(text).toContain(
        `NOT EXISTS ( SELECT 1 FROM pwd WHERE "userId" = $${args.length} AND archived = FALSE )`,
      );
      if (
        row.userId !== userId ||
        !row.archived ||
        passwords.some((item) => item.userId === userId && !item.archived)
      )
        return { rows: [], rowCount: 0 };
    }
    expect(text).not.toMatch(/twoFactor/);
    for (const match of text.matchAll(
      /"?([A-Za-z]\w*)"? = CASE WHEN id = \$1 THEN \$(\d+) ELSE/g,
    )) {
      row[match[1]] = args[Number(match[2]) - 1];
    }
    return { rows: [], rowCount: 1 };
  }
  if (text.startsWith("UPDATE token SET")) {
    expect(text).toContain('"verifiedAt" = NOW()');
    expect(args).toEqual([token.id]);
    token.verifiedAt = new Date();
    token.archived = true;
    return { rows: [], rowCount: 1 };
  }
  throw new Error(`Unexpected SQL in recovery HTTP test: ${text}`);
}

beforeAll(async () => {
  oldHash = await encrypt(OLD, process.env.PWD_SECRET);
});

beforeEach(() => {
  jest.resetAllMocks();
  user = { id: 55, active: true, archived: false };
  token = {
    id: 10,
    typeId: 3,
    userId: 55,
    hash: hashToken(LINK),
    attempts: 0,
    expiresAt: new Date(Date.now() + 60_000),
    archived: false,
    verifiedAt: null,
  };
  passwords = [7, 9].map((id) => ({
    id,
    userId: 55,
    pwdHash: oldHash,
    archived: true,
    archivedAt: new Date("2026-01-01"),
    twoFactorEnabled: true,
    twoFactorSecret: "JBSWY3DPEHPK3PXP",
    failedAttempts: 5,
    lockedUntil: new Date(Date.now() + 60_000),
  }));
  query.mockImplementation(database);
  jest.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
    expect(url).toBe(process.env.USER_SEARCH_URL);
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      filters: {
        id: { value: 55, matchMode: "equals" },
        active: { value: true, matchMode: "equals" },
        archived: { value: false, matchMode: "equals" },
      },
    });
    return { ok: true, json: async () => ({ rows: user ? [user] : [] }) };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("GET/POST /foxnox/web/recover/reset", () => {
  it("should render a valid link without restoring a password or consuming the token", async () => {
    const before = structuredClone(passwords);
    const form = await request(app).get(`${BASE}/recover/reset?token=${LINK}`);
    expectHtml(form, 200, `name="token" value="${LINK}"`);
    expect(passwords).toEqual(before);
    expect(writes("pwd")).toHaveLength(0);
    expect(writes("token")).toHaveLength(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each(["archived", "active"])(
    "should replace the newest %s hash, preserve 2FA and consume the token after writing",
    async (state) => {
      if (state === "active") {
        passwords[1].archived = false;
        passwords[1].archivedAt = null;
      }
      const before = structuredClone(passwords);
      expectHtml(await postReset(), 200, "Your password has been changed.");
      expect(passwords.filter((row) => !row.archived)).toHaveLength(1);
      expect(passwords[0]).toEqual(before[0]);
      expect(passwords[1]).toMatchObject({
        id: 9,
        archived: false,
        archivedAt: null,
        failedAttempts: 0,
        lockedUntil: null,
        twoFactorEnabled: true,
        twoFactorSecret: before[1].twoFactorSecret,
      });
      expect(passwords[1].pwdHash).not.toBe(oldHash);
      expect(
        await compare(NEXT, passwords[1].pwdHash, process.env.PWD_SECRET),
      ).toBe(true);
      expect(
        await compare(OLD, passwords[1].pwdHash, process.env.PWD_SECRET),
      ).toBe(false);
      expect(passwords[1].pwdUpdatedAt).toBeInstanceOf(Date);
      expect(
        passwords[1].pwdExpiry.getTime() - passwords[1].pwdUpdatedAt.getTime(),
      ).toBe(30 * 86_400_000);
      expect(writes("pwd")).toHaveLength(1);
      expect(writes("pwd")[0][1][0]).toBe(9);
      expect(writes("pwd")[0][0]).toMatch(/^UPDATE public\.pwd\b/);
      expect(token).toMatchObject({
        archived: true,
        verifiedAt: expect.any(Date),
      });
      expect(writes("token")).toHaveLength(1);
      const pwdWrite = query.mock.calls.indexOf(writes("pwd")[0]);
      const tokenWrite = query.mock.calls.indexOf(writes("token")[0]);
      expect(pwdWrite).toBeLessThan(tokenWrite);
    },
  );

  it("should reject replay of a successfully consumed link without another password write", async () => {
    expectHtml(await postReset(), 200, "Your password has been changed.");
    const after = structuredClone(passwords);
    expectHtml(await postReset(), 400, "This link is no longer valid");
    expectHtml(
      await request(app).get(`${BASE}/recover/reset?token=${LINK}`),
      400,
      "This link is no longer valid",
    );
    expect(passwords).toEqual(after);
    expect(writes("pwd")).toHaveLength(1);
    expect(writes("token")).toHaveLength(1);
  });

  it.each([
    ["archived", { id: 55, active: true, archived: true }],
    ["inactive", { id: 55, active: false, archived: false }],
    ["unknown", null],
  ])(
    "should deny an %s account even with a valid token",
    async (_name, account) => {
      user = account;
      const before = structuredClone(passwords);
      expectHtml(await postReset(), 400, "This link is no longer valid");
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(passwords).toEqual(before);
      expect(writes("pwd")).toHaveLength(0);
      expect(writes("token")).toHaveLength(0);
      expect(token).toMatchObject({ archived: false, verifiedAt: null });
    },
  );

  it.each(["missing", "invalid", "expired", "reused"])(
    "should reject a %s link on GET and POST without password mutation",
    async (state) => {
      if (state === "expired") token.expiresAt = new Date(Date.now() - 1000);
      if (state === "reused") {
        token.archived = true;
        token.verifiedAt = new Date();
      }
      const plaintext =
        state === "missing" ? "" : state === "invalid" ? "wrong" : LINK;
      const before = structuredClone(passwords);
      expectHtml(
        await request(app)
          .get(`${BASE}/recover/reset`)
          .query({ token: plaintext }),
        400,
        "This link is no longer valid",
      );
      expectHtml(
        await postReset({ token: plaintext }),
        400,
        "This link is no longer valid",
      );
      expect(passwords).toEqual(before);
      expect(writes("pwd")).toHaveLength(0);
      expect(writes("token")).toHaveLength(0);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    },
  );

  it("should leave a valid token unconsumed when the account has no password rows", async () => {
    passwords = [];
    expectHtml(await postReset(), 400, "This link is no longer valid");
    expect(writes("pwd")).toHaveLength(0);
    expect(writes("token")).toHaveLength(0);
    expect(token.verifiedAt).toBeNull();
  });

  it.each([
    ["guarded write affects no rows", false, 400],
    ["database write fails", true, 500],
  ])("should not consume the token when %s", async (_name, rejects, status) => {
    const before = structuredClone(passwords);
    query.mockImplementation(async (sql, args) => {
      if (sql.trim().startsWith("UPDATE public.pwd")) {
        if (rejects) throw new Error("password write unavailable");
        return { rows: [], rowCount: 0 };
      }
      return database(sql, args);
    });
    expectHtml(await postReset(), status, "This link is no longer valid");
    expect(passwords).toEqual(before);
    expect(writes("pwd")).toHaveLength(1);
    expect(writes("token")).toHaveLength(0);
    expect(token).toMatchObject({ archived: false, verifiedAt: null });
  });
});

describe("POST /foxnox/web/password/expired", () => {
  it("should not restore archived passwords through ordinary expired-password rotation", async () => {
    token.typeId = 4;
    const before = structuredClone(passwords);
    const { cookie, body } = csrfForm({
      challenge: LINK,
      password: NEXT,
      confirm: NEXT,
    });
    const res = await request(app)
      .post(`${BASE}/password/expired`)
      .set("Cookie", cookie)
      .type("form")
      .send(body);
    expectHtml(res, 500, "Something went wrong. Please try again.");
    expect(
      query.mock.calls.find(([sql]) => sql.includes("FROM token_type"))[1],
    ).toEqual(["Expired password challenge"]);
    expect(passwords).toEqual(before);
    expect(writes("pwd")).toHaveLength(0);
    expect(writes("token")).toHaveLength(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(token).toMatchObject({ archived: false, verifiedAt: null });
  });
});
