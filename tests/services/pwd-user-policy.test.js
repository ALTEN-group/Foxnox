/** @jest-environment node */
// @ts-check

import { jest } from "@jest/globals";

process.env.PWD_SECRET = "test-secret-for-unit-tests-only";

const getCache = jest.fn();
const findUserRoleIds = jest.fn();

jest.unstable_mockModule("@dwtechs/antity-pgsql", () => ({
  execute: jest.fn(),
}));
jest.unstable_mockModule("../../src/entities/pwd-policy.js", () => ({
  default: { getCache },
}));
jest.unstable_mockModule("../../src/entities/pwd.js", () => ({
  default: { query: {} },
}));
jest.unstable_mockModule("../../src/services/users.js", () => ({
  findUserRoleIds,
}));

const { getPwdPolicyForUser, getPasswordFormPolicy, mergeStrictestPolicies } =
  await import("../../src/services/pwd.js");

const row = (/** @type {object} */ extra) => ({
  length: 12,
  number: true,
  symbol: true,
  lowerCase: true,
  upperCase: true,
  ...extra,
});

const policies = [
  row({ id: 1, length: 10, roleIds: [4] }),
  row({ id: 2, length: 16, roleIds: [1, 2] }),
  row({ id: 3, length: 12, roleIds: [3] }),
];

/** @param {object} extra */
const policy = (extra) => ({
  id: 1,
  length: 12,
  number: false,
  symbol: false,
  lowerCase: false,
  upperCase: false,
  strict: false,
  expiryDays: 0,
  maxFailedAttempts: 5,
  lockoutMinutes: 15,
  roleIds: [],
  ...extra,
});

describe("mergeStrictestPolicies", () => {
  it("should return null without policies", () => {
    expect(mergeStrictestPolicies([])).toBeNull();
  });

  it("should return an equivalent policy for a single one", () => {
    const p = policy({ id: 4, length: 14, number: true, roleIds: [2] });
    expect(mergeStrictestPolicies([p])).toEqual(p);
  });

  it("should take the longest length and every required character class", () => {
    const merged = mergeStrictestPolicies([
      policy({ id: 1, length: 10, number: true, lowerCase: true }),
      policy({
        id: 2,
        length: 16,
        symbol: true,
        upperCase: true,
        strict: true,
      }),
    ]);

    expect(merged).toMatchObject({
      length: 16,
      number: true,
      symbol: true,
      lowerCase: true,
      upperCase: true,
      strict: true,
    });
  });

  it("should take the shortest expiry and ignore 0 (never expires)", () => {
    expect(
      mergeStrictestPolicies([
        policy({ expiryDays: 0 }),
        policy({ expiryDays: 90 }),
        policy({ expiryDays: 30 }),
      ])?.expiryDays,
    ).toBe(30);
    expect(
      mergeStrictestPolicies([policy({ expiryDays: 0 }), policy({})])
        ?.expiryDays,
    ).toBe(0);
  });

  it("should take the fewest failed attempts and the longest lockout", () => {
    expect(
      mergeStrictestPolicies([
        policy({ maxFailedAttempts: 5, lockoutMinutes: 15 }),
        policy({ maxFailedAttempts: 3, lockoutMinutes: 5 }),
        policy({ maxFailedAttempts: 10, lockoutMinutes: 60 }),
      ]),
    ).toMatchObject({ maxFailedAttempts: 3, lockoutMinutes: 60 });
  });

  it("should use the lowest id and the sorted union of role ids", () => {
    expect(
      mergeStrictestPolicies([
        policy({ id: 7, roleIds: [4, 2] }),
        policy({ id: 3, roleIds: [2, 1] }),
      ]),
    ).toMatchObject({ id: 3, roleIds: [1, 2, 4] });
  });
});

describe("getPwdPolicyForUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCache.mockResolvedValue(policies);
  });

  it("should return the policy attached to the user's role", async () => {
    findUserRoleIds.mockResolvedValue([3]);

    await expect(getPwdPolicyForUser(9)).resolves.toMatchObject({
      id: 3,
      length: 12,
    });
    expect(findUserRoleIds).toHaveBeenCalledWith(9);
  });

  it("should merge the policies of all the user's roles, whatever their ids", async () => {
    findUserRoleIds.mockResolvedValue([3, 1]);

    await expect(getPwdPolicyForUser(9)).resolves.toMatchObject({
      id: 2,
      length: 16,
      roleIds: [1, 2, 3],
    });
  });

  it("should ignore roles that no policy lists", async () => {
    findUserRoleIds.mockResolvedValue([5, 4]);

    await expect(getPwdPolicyForUser(9)).resolves.toMatchObject({
      id: 1,
      length: 10,
    });
  });

  it("should fall back to the first policy when the user has no mapped role", async () => {
    findUserRoleIds.mockResolvedValue([5]);
    await expect(getPwdPolicyForUser(9)).resolves.toMatchObject({ id: 1 });

    findUserRoleIds.mockResolvedValue([]);
    await expect(getPwdPolicyForUser(9)).resolves.toMatchObject({ id: 1 });
  });

  it("should not query users when no policy lists a role", async () => {
    getCache.mockResolvedValue([row({ id: 1 }), row({ id: 2, roleIds: [] })]);

    await expect(getPwdPolicyForUser(9)).resolves.toMatchObject({ id: 1 });
    expect(findUserRoleIds).not.toHaveBeenCalled();
  });

  it("should return null without any policy", async () => {
    getCache.mockResolvedValue([]);
    await expect(getPwdPolicyForUser(9)).resolves.toBeNull();
  });
});

describe("getPasswordFormPolicy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCache.mockResolvedValue(policies);
  });

  it("should use the user's policy when a user id is given", async () => {
    findUserRoleIds.mockResolvedValue([2]);

    await expect(getPasswordFormPolicy(9)).resolves.toMatchObject({
      minLength: 16,
    });
  });

  it("should use the default policy without a user id", async () => {
    await expect(getPasswordFormPolicy()).resolves.toMatchObject({
      minLength: 10,
    });
    expect(findUserRoleIds).not.toHaveBeenCalled();
  });
});
