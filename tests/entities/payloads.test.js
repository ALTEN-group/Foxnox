// @ts-check
/**
 * Regression tests for the JSON payloads the CRUD routes actually receive:
 * dates arrive as epoch milliseconds or ISO strings (never `Date`), and every
 * NOT NULL column must be reachable through antity's fixed INSERT column list.
 *
 * The real entities are used (no mocks); only the pure normalize / validate
 * middlewares and query builders run, so no Postgres connection is opened.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { toDate } from "../../src/entities/normalizers.js";
import ppEnt, { DEFAULTS } from "../../src/entities/pwd-policy.js";
import pEnt from "../../src/entities/pwd.js";
import tEnt from "../../src/entities/token.js";
import tdEnt from "../../src/entities/user-device.js";
import { dropNulls } from "../../src/middlewares/mappers/drop-nulls.js";
import { fillDefaults } from "../../src/middlewares/mappers/fill-defaults.js";

/**
 * Runs antity's `normalizeArray` then `validateArray`, like the route substacks.
 *
 * @param {any} entity
 * @param {string} method
 * @param {Record<string, unknown>[]} rows
 * @returns {{ error: any, rows: Record<string, unknown>[] }}
 */
function submit(entity, method, rows) {
  const req = { method, body: { rows } };
  let error = null;
  const next = (e) => {
    if (e) error = e;
  };
  entity.normalizeArray(req, {}, next);
  if (!error) entity.validateArray(req, {}, next);
  return { error, rows: req.body.rows };
}

describe("toDate normalizer", () => {
  it("coerces epoch milliseconds, ISO strings and numeric strings", () => {
    const ms = 1787332073835;
    expect(toDate(ms)).toEqual(new Date(ms));
    expect(toDate(String(ms))).toEqual(new Date(ms));
    expect(toDate("2026-08-21T17:07:36.463Z")).toEqual(
      new Date("2026-08-21T17:07:36.463Z"),
    );
  });

  it("passes through Dates and leaves unparseable values untouched", () => {
    const d = new Date("2026-08-21T17:07:36.463Z");
    expect(toDate(d)).toBe(d);
    expect(toDate("not-a-date")).toBe("not-a-date");
    expect(toDate(Number.NaN)).toBeNaN();
    expect(toDate(1e20)).toBe(1e20);
  });
});

describe("date payload coercion", () => {
  const cases = [
    {
      label: "PUT pwd — pwdUpdatedAt as epoch ms",
      entity: pEnt,
      method: "PUT",
      key: "pwdUpdatedAt",
      row: { id: 1, pwdUpdatedAt: 1787332073835 },
    },
    {
      label: "PUT pwd policy — createdAt echoed back as an ISO string",
      entity: ppEnt,
      method: "PUT",
      key: "createdAt",
      row: { id: 1, length: 16, createdAt: "2026-08-21T17:07:36.463Z" },
    },
    {
      label: "PUT token — createdAt echoed back as an ISO string",
      entity: tEnt,
      method: "PUT",
      key: "createdAt",
      row: { id: 1, createdAt: "2026-08-21T17:07:36.565Z" },
    },
    {
      label: "POST token — expiresAt as epoch ms",
      entity: tEnt,
      method: "POST",
      key: "expiresAt",
      row: { userId: 1, typeId: 1, expiresAt: 1787340853498 },
    },
    {
      label: "PUT trusted device — expiresAt as epoch ms",
      entity: tdEnt,
      method: "PUT",
      key: "expiresAt",
      row: { id: 1, expiresAt: 1788249600000 },
    },
    {
      label: "POST trusted device — expiresAt as epoch ms",
      entity: tdEnt,
      method: "POST",
      key: "expiresAt",
      row: {
        userId: 1,
        deviceTokenHash: "9f2c1b0d7e4a",
        expiresAt: 1788249600000,
      },
    },
  ];

  it.each(cases)("$label", ({ entity, method, row, key }) => {
    const { error, rows } = submit(entity, method, [{ ...row }]);
    expect(error).toBeNull();
    expect(rows[0][key]).toBeInstanceOf(Date);
    expect(rows[0][key].getTime()).toBe(new Date(row[key]).getTime());
  });

  it("still rejects a value that is not a date", () => {
    const { error } = submit(pEnt, "PUT", [
      { id: 1, pwdUpdatedAt: "yesterday" },
    ]);
    expect(error).not.toBeNull();
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain("pwdUpdatedAt");
  });
});

describe("pwd_policy NOT NULL columns", () => {
  const full = {
    name: "default",
    description: "Baseline dev policy",
    length: 12,
    number: true,
    symbol: true,
    lowerCase: true,
    upperCase: true,
    strict: true,
    symbols: "!@#$%^&*",
    expiryDays: 365,
    maxFailedAttempts: 5,
    lockoutMinutes: 15,
  };

  it("inserts a complete row without binding NULL to a NOT NULL column", () => {
    const { error, rows } = submit(ppEnt, "POST", [{ ...full }]);
    expect(error).toBeNull();

    const { query, args } = ppEnt.query.insert(rows, {
      userId: -1,
      nickname: "system",
    });
    expect(query).toContain("symbols");
    expect(args).not.toContain(undefined);
    expect(args).not.toContain(null);
  });

  it("applies the column defaults when the caller omits them", () => {
    const req = { body: { rows: [{ name: "TOTO" }] } };
    fillDefaults(DEFAULTS)(
      /** @type {any} */ (req),
      /** @type {any} */ ({}),
      () => {},
    );
    const { error, rows } = submit(ppEnt, "POST", req.body.rows);
    expect(error).toBeNull();

    const { args } = ppEnt.query.insert(rows, {
      userId: -1,
      nickname: "system",
    });
    expect(rows[0].symbols).toBe(DEFAULTS.symbols);
    expect(args).not.toContain(null);
  });

  it("treats an unfilled create-form field sent as null like an omission", () => {
    // Payload of a create form that leaves the symbol pool empty.
    const req = {
      body: {
        rows: [
          {
            id: null,
            name: "TOTO",
            description: "pouet",
            length: 8,
            number: true,
            symbol: true,
            lowerCase: false,
            upperCase: false,
            strict: false,
            symbols: null,
            expiryDays: 0,
            maxFailedAttempts: 5,
            lockoutMinutes: 15,
            archived: false,
            archivedAt: null,
            createdAt: null,
            creatorName: null,
            updatedAt: null,
            updaterName: null,
          },
        ],
      },
    };
    fillDefaults(DEFAULTS)(
      /** @type {any} */ (req),
      /** @type {any} */ ({}),
      () => {},
    );
    const { error, rows } = submit(ppEnt, "POST", req.body.rows);
    expect(error).toBeNull();
    expect(rows[0].symbols).toBe(DEFAULTS.symbols);

    const { args } = ppEnt.query.insert(rows, {
      userId: -1,
      nickname: "system",
    });
    expect(args).not.toContain(null);
    // Values the caller did fill in are preserved, including the falsy ones.
    expect(rows[0]).toMatchObject({ length: 8, lowerCase: false, strict: false });
  });

  it("still rejects a POST with no name, which has no default", () => {
    const req = { body: { rows: [{ description: "no name" }] } };
    fillDefaults(DEFAULTS)(
      /** @type {any} */ (req),
      /** @type {any} */ ({}),
      () => {},
    );
    const { error } = submit(ppEnt, "POST", req.body.rows);
    expect(error).not.toBeNull();
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain("name");
  });

  it("keeps DEFAULTS in sync with the Liquibase struct file", () => {
    const sql = readFileSync(
      fileURLToPath(
        new URL(
          "../../db/liquibase/foxnox/versions/03-struct/02-pwd-policy-struct.sql",
          import.meta.url,
        ),
      ),
      "utf8",
    );

    for (const [column, value] of Object.entries(DEFAULTS)) {
      const line = sql
        .split("\n")
        .find((l) => l.trim().match(new RegExp(`^"?${column}"?\\s`, "i")));
      expect(line).toBeDefined();
      const sqlDefault = /DEFAULT\s+(?:'([^']*)'|(\S+))/i.exec(
        /** @type {string} */ (line),
      );
      expect(sqlDefault).not.toBeNull();
      const raw = sqlDefault[1] ?? sqlDefault[2];
      const parsed =
        typeof value === "boolean"
          ? raw.toUpperCase() === "TRUE"
          : typeof value === "number"
            ? Number(raw)
            : raw;
      expect({ [column]: parsed }).toEqual({ [column]: value });
    }
  });

  it("allows a PUT that patches a single column", () => {
    const { error } = submit(ppEnt, "PUT", [{ id: 1, length: 16 }]);
    expect(error).toBeNull();
  });
});

describe("full-row PUT round-trip", () => {
  it("builds an UPDATE that leaves pwdHash and twoFactorSecret alone", () => {
    const row = {
      id: 1,
      userId: 1,
      pwdHash: null,
      pwdUpdatedAt: 1787993503783,
      pwdExpiry: 1788127200000,
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      archived: false,
      archivedAt: null,
      createdAt: "2026-08-29T08:51:43.783Z",
      creatorName: null,
      updatedAt: null,
      updaterName: null,
    };

    const req = { method: "PUT", body: { rows: [row] } };
    dropNulls(pEnt)(/** @type {any} */ (req), /** @type {any} */ ({}), () => {});
    const { error, rows } = submit(pEnt, "PUT", req.body.rows);
    expect(error).toBeNull();

    const { query } = pEnt.query.update(rows, {
      userId: -1,
      nickname: "system",
    });
    expect(query).not.toContain("pwdHash");
    expect(query).not.toContain("twoFactorSecret");
    // The columns the caller actually meant to change are still there.
    expect(query).toContain("pwdUpdatedAt");
    expect(query).toContain("lockedUntil");
  });
});

describe("token.hash", () => {
  it("is left out of the INSERT so the column default generates it", () => {
    const { error, rows } = submit(tEnt, "POST", [
      { userId: 1, typeId: 1, expiresAt: 1787340853498 },
    ]);
    expect(error).toBeNull();

    const { query, args } = tEnt.query.insert(rows, {
      userId: -1,
      nickname: "system",
    });
    expect(query).not.toContain("hash");
    expect(args).not.toContain(undefined);
  });
});
