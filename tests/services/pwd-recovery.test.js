/** @jest-environment node */
// @ts-check

import { jest } from "@jest/globals";

const SECRET = "test-secret-for-unit-tests-only";
const STRONG = "NewPassword1!xyZZ";
const USER_ID = 42;
const PWD_ID = 19;
const previousSecret = process.env.PWD_SECRET;
process.env.PWD_SECRET = SECRET;

// Keep SQLEntity and hashing real; replace only the DB boundary and wrap encrypt
// so its inputs, ordering and failures remain observable.
const antity = await import("@dwtechs/antity-pgsql");
const hashitaka = await import("@dwtechs/hashitaka");
const execute = jest.fn();
const encrypt = jest.fn(hashitaka.encrypt);
const getCache = jest.fn();
const isActiveUser = jest.fn();
const findUserRoleIds = jest.fn();

jest.unstable_mockModule("@dwtechs/antity-pgsql", () => ({
  ...antity,
  execute,
}));
jest.unstable_mockModule("@dwtechs/hashitaka", () => ({
  ...hashitaka,
  encrypt,
}));
jest.unstable_mockModule("../../src/entities/pwd-policy.js", () => ({
  default: { getCache },
}));
jest.unstable_mockModule("../../src/services/users.js", () => ({
  isActiveUser,
  findUserRoleIds,
}));

const pEnt = (await import("../../src/entities/pwd.js")).default;
const { recoverPassword, rotatePassword } = await import(
  "../../src/services/pwd.js"
);
const antitySelect = pEnt.query.select;
const antityUpdate = pEnt.query.update;
const select = jest.spyOn(pEnt.query, "select");
const update = jest.spyOn(pEnt.query, "update");

const policy = {
  id: 1,
  length: 12,
  number: true,
  symbol: true,
  lowerCase: true,
  upperCase: true,
  expiryDays: 30,
  roleIds: [],
};

function expectSelect(call, archived, direction) {
  expect(select).toHaveBeenNthCalledWith(call, 0, 1, "id", direction, {
    userId: { value: USER_ID, matchMode: "equals" },
    archived: { value: archived, matchMode: "equals" },
  });
  const [sql, args, tx] = execute.mock.calls[call - 1];
  expect(sql).toContain("FROM public.pwd");
  expect(sql).toContain(
    `WHERE "userId" = $1 AND archived = $2 ORDER BY id ${direction} LIMIT 1 OFFSET 0`,
  );
  expect(args).toEqual([USER_ID, archived]);
  expect(tx).toBeNull();
}

function expectPasswordPatch() {
  expect(update).toHaveBeenCalledTimes(1);
  const [patches, consumer] = update.mock.calls[0];
  expect(consumer).toEqual({ userId: -1, nickname: "system" });
  expect(patches).toEqual([
    {
      id: PWD_ID,
      pwdHash: expect.any(String),
      pwdUpdatedAt: expect.any(Date),
      pwdExpiry: expect.any(Date),
      failedAttempts: 0,
      lockedUntil: null,
    },
  ]);
  const patch = patches[0];
  expect(patch.pwdExpiry.getTime() - patch.pwdUpdatedAt.getTime()).toBe(
    30 * 86_400_000,
  );
  return patch;
}

describe("password recovery and rotation boundaries", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Reset mocks also clears spy implementations; explicitly call through.
    select.mockImplementation(antitySelect);
    update.mockImplementation(antityUpdate);
    encrypt.mockImplementation(hashitaka.encrypt);
    isActiveUser.mockResolvedValue(true);
    getCache.mockResolvedValue([{ ...policy }]);
    findUserRoleIds.mockResolvedValue([]);
    execute.mockRejectedValue(new Error("Unexpected database call"));
  });

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.PWD_SECRET;
    else process.env.PWD_SECRET = previousSecret;
  });

  it("should reject an unavailable account before policy, DB or hashing", async () => {
    isActiveUser.mockResolvedValue(false);

    await expect(recoverPassword(USER_ID, STRONG)).rejects.toMatchObject({
      code: "USER_UNAVAILABLE",
    });
    expect(isActiveUser).toHaveBeenCalledTimes(1);
    expect(isActiveUser).toHaveBeenCalledWith(USER_ID);
    expect(getCache).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(encrypt).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("should propagate an eligibility lookup error without DB access", async () => {
    const error = new Error("user lookup unavailable");
    isActiveUser.mockRejectedValue(error);

    await expect(recoverPassword(USER_ID, STRONG)).rejects.toBe(error);
    expect(getCache).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(encrypt).not.toHaveBeenCalled();
  });

  it("should update an active password normally without restoring or changing 2FA", async () => {
    const current = {
      id: String(PWD_ID),
      userId: USER_ID,
      pwdHash: "old-hash",
      archived: false,
      twoFactorEnabled: true,
      twoFactorSecret: "existing-enrollment",
    };
    execute
      .mockResolvedValueOnce({ rows: [current] })
      .mockResolvedValueOnce({ rowCount: 1 });
    const started = Date.now();

    await expect(recoverPassword(USER_ID, STRONG)).resolves.toEqual({
      updated: true,
    });

    expectSelect(1, false, "ASC");
    expect(select).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(isActiveUser).toHaveBeenCalledWith(USER_ID);
    expect(isActiveUser.mock.invocationCallOrder[0]).toBeLessThan(
      getCache.mock.invocationCallOrder[0],
    );
    expect(getCache.mock.invocationCallOrder[0]).toBeLessThan(
      execute.mock.invocationCallOrder[0],
    );
    expect(execute.mock.invocationCallOrder[0]).toBeLessThan(
      encrypt.mock.invocationCallOrder[0],
    );
    expect(encrypt.mock.invocationCallOrder[0]).toBeLessThan(
      execute.mock.invocationCallOrder[1],
    );
    const patch = expectPasswordPatch();
    expect(patch.pwdUpdatedAt.getTime()).toBeGreaterThanOrEqual(started);
    expect(patch.pwdUpdatedAt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(encrypt).toHaveBeenCalledWith(STRONG, SECRET);
    expect(patch.pwdHash).not.toBe(current.pwdHash);
    await expect(
      hashitaka.compare(STRONG, patch.pwdHash, SECRET),
    ).resolves.toBe(true);
    await expect(
      hashitaka.compare("OldPassword1!", patch.pwdHash, SECRET),
    ).resolves.toBe(false);
    const [sql, args, tx] = execute.mock.calls[1];
    expect(sql).toContain("UPDATE public.pwd SET");
    expect(sql).toContain("WHERE id IN ($1)");
    expect(sql).not.toMatch(/archived|twoFactor|lastLoginAt|INSERT/i);
    expect(args).toEqual([
      PWD_ID,
      patch.pwdHash,
      patch.pwdUpdatedAt,
      patch.pwdExpiry,
      0,
      null,
      -1,
      "system",
    ]);
    expect(tx).toBeNull();
  });

  it("should restore only the newest archived row with a guarded Antity UPDATE", async () => {
    const archived = {
      id: String(PWD_ID),
      pwdHash: "archived-old-hash",
      archived: true,
      twoFactorEnabled: true,
      twoFactorSecret: "preserved-enrollment",
    };
    execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [archived] })
      .mockResolvedValueOnce({ rowCount: 1 });

    await expect(recoverPassword(USER_ID, STRONG)).resolves.toEqual({
      updated: true,
    });

    expectSelect(1, false, "ASC");
    expectSelect(2, true, "DESC");
    expect(select).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenCalledTimes(3);
    expect(encrypt).toHaveBeenCalledTimes(1);
    expect(encrypt).toHaveBeenCalledWith(STRONG, SECRET);
    expect(execute.mock.invocationCallOrder[1]).toBeLessThan(
      encrypt.mock.invocationCallOrder[0],
    );
    expect(encrypt.mock.invocationCallOrder[0]).toBeLessThan(
      execute.mock.invocationCallOrder[2],
    );
    expect(update).toHaveBeenCalledTimes(1);
    const [patches, consumer] = update.mock.calls[0];
    expect(consumer).toEqual({ userId: -1, nickname: "system" });
    expect(patches).toEqual([
      {
        id: PWD_ID,
        pwdHash: expect.any(String),
        pwdUpdatedAt: expect.any(Date),
        pwdExpiry: expect.any(Date),
        failedAttempts: 0,
        lockedUntil: null,
        archived: false,
        archivedAt: null,
      },
    ]);
    const [sql, args, tx] = execute.mock.calls[2];
    expect(sql).toContain("UPDATE public.pwd SET");
    expect(sql).toContain("WHERE id IN ($1)");
    expect(sql).toContain('"userId" = $11 AND archived = TRUE');
    expect(sql.replace(/\s+/g, " ")).toContain(
      'NOT EXISTS ( SELECT 1 FROM pwd WHERE "userId" = $11 AND archived = FALSE )',
    );
    expect(args).toEqual([
      PWD_ID,
      expect.any(String),
      expect.any(Date),
      expect.any(Date),
      0,
      null,
      false,
      null,
      -1,
      "system",
      USER_ID,
    ]);
    const [, pwdHash, now, expiry] = args;
    expect(expiry.getTime() - now.getTime()).toBe(30 * 86_400_000);
    expect(tx).toBeNull();
    expect(sql).not.toMatch(/twoFactor|lastLoginAt|INSERT/i);
    expect(pwdHash).not.toBe(archived.pwdHash);
    await expect(hashitaka.compare(STRONG, pwdHash, SECRET)).resolves.toBe(
      true,
    );
    await expect(
      hashitaka.compare("OldPassword1!", pwdHash, SECRET),
    ).resolves.toBe(false);
  });

  it.each([0, -1])(
    "should clear expiry when policy expiryDays is %i",
    async (expiryDays) => {
      getCache.mockResolvedValue([{ ...policy, expiryDays }]);
      execute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: PWD_ID }] })
        .mockResolvedValueOnce({ rowCount: 1 });

      await expect(recoverPassword(USER_ID, STRONG)).resolves.toEqual({
        updated: true,
      });
      expect(update).toHaveBeenCalledTimes(1);
      expect(execute.mock.calls[2][1][3]).toBeNull();
    },
  );

  it.each([
    ["weak", { code: "WEAK_PASSWORD" }],
    ["", { code: "WEAK_PASSWORD" }],
    [null, { name: "TypeError" }],
    [undefined, { name: "TypeError" }],
    [123, { code: "WEAK_PASSWORD" }],
    ["A1!a".repeat(17), { code: "WEAK_PASSWORD" }],
  ])(
    "should reject invalid password %p before querying or hashing",
    async (plaintext, error) => {
      await expect(recoverPassword(USER_ID, plaintext)).rejects.toMatchObject(
        error,
      );
      expect(isActiveUser).toHaveBeenCalledWith(USER_ID);
      expect(getCache).toHaveBeenCalledTimes(1);
      expect(execute).not.toHaveBeenCalled();
      expect(encrypt).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    },
  );

  it.each([
    { rows: [] },
    {},
    { rows: null },
    { rows: [{}] },
    { rows: [{ id: null }] },
  ])(
    "should never create a row when archived lookup returns %p",
    async (result) => {
      execute.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce(result);

      await expect(recoverPassword(USER_ID, STRONG)).rejects.toMatchObject({
        code: "PWD_NOT_FOUND",
      });
      expectSelect(1, false, "ASC");
      expectSelect(2, true, "DESC");
      expect(execute).toHaveBeenCalledTimes(2);
      expect(encrypt).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["active", { rowCount: 0 }],
    ["active", {}],
    ["archived", { rowCount: 0 }],
    ["archived", {}],
    ["archived", { rowCount: null }],
  ])(
    "should reject a lost %s update with result %p without retrying or inserting",
    async (path, result) => {
      if (path === "archived") execute.mockResolvedValueOnce({ rows: [] });
      execute
        .mockResolvedValueOnce({ rows: [{ id: PWD_ID }] })
        .mockResolvedValueOnce(result);

      await expect(recoverPassword(USER_ID, STRONG)).rejects.toMatchObject({
        code: "PWD_NOT_FOUND",
      });
      expect(execute).toHaveBeenCalledTimes(path === "active" ? 2 : 3);
      expect(update).toHaveBeenCalledTimes(1);
      expect(encrypt).toHaveBeenCalledTimes(1);
      expect(execute.mock.calls.at(-1)[0]).toMatch(/^UPDATE /);
    },
  );

  it.each(["policy", "active select", "archived select", "hash", "update"])(
    "should propagate a %s error without subsequent DB operations",
    async (stage) => {
      const error = new Error(`${stage} failed`);
      let expectedCalls = 0;
      if (stage === "policy") {
        getCache.mockRejectedValue(error);
      } else {
        expectedCalls = 1;
        if (stage !== "active select") {
          execute.mockResolvedValueOnce({ rows: [] });
          expectedCalls = 2;
        }
        if (stage === "hash" || stage === "update") {
          execute.mockResolvedValueOnce({ rows: [{ id: PWD_ID }] });
          if (stage === "hash") encrypt.mockRejectedValue(error);
          else expectedCalls = 3;
        }
        execute.mockRejectedValue(error);
      }

      await expect(recoverPassword(USER_ID, STRONG)).rejects.toBe(error);
      expect(execute).toHaveBeenCalledTimes(expectedCalls);
      expect(update).toHaveBeenCalledTimes(stage === "update" ? 1 : 0);
      if (!["hash", "update"].includes(stage)) {
        expect(encrypt).not.toHaveBeenCalled();
      }
    },
  );

  it("should apply default password validation when no policy exists", async () => {
    getCache.mockResolvedValue([]);
    execute
      .mockResolvedValueOnce({ rows: [{ id: PWD_ID }] })
      .mockResolvedValueOnce({ rowCount: 1 });

    await expect(recoverPassword(USER_ID, STRONG)).resolves.toEqual({
      updated: true,
    });
    expect(update.mock.calls[0][0][0].pwdExpiry).toBeNull();
    expect(encrypt).toHaveBeenCalledWith(STRONG, SECRET);
  });

  it("should enforce the user-specific policy before selecting passwords", async () => {
    getCache.mockResolvedValue([
      { ...policy },
      { ...policy, id: 2, roleIds: [9], length: 24 },
    ]);
    findUserRoleIds.mockResolvedValue([9]);

    await expect(recoverPassword(USER_ID, STRONG)).rejects.toMatchObject({
      code: "WEAK_PASSWORD",
    });
    expect(findUserRoleIds).toHaveBeenCalledWith(USER_ID);
    expect(execute).not.toHaveBeenCalled();
    expect(encrypt).not.toHaveBeenCalled();
  });

  it("should never restore archived passwords through default rotation", async () => {
    execute.mockResolvedValueOnce({ rows: [] });

    await expect(rotatePassword(USER_ID, STRONG)).rejects.toMatchObject({
      code: "PWD_NOT_FOUND",
    });
    expectSelect(1, false, "ASC");
    expect(select).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(isActiveUser).not.toHaveBeenCalled();
    expect(encrypt).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("should keep default rotation independent of recovery eligibility", async () => {
    isActiveUser.mockResolvedValue(false);
    execute
      .mockResolvedValueOnce({ rows: [{ id: PWD_ID }] })
      .mockResolvedValueOnce({ rowCount: 1 });

    await expect(rotatePassword(USER_ID, STRONG)).resolves.toEqual({
      updated: true,
    });
    expect(isActiveUser).not.toHaveBeenCalled();
    expectSelect(1, false, "ASC");
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[1][0]).not.toMatch(/archived|twoFactor/);
    expectPasswordPatch();
  });
});
