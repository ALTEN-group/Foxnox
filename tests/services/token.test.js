/** @jest-environment node */
import { jest } from "@jest/globals";

const execute = jest.fn();
jest.unstable_mockModule("@dwtechs/antity-pgsql", () => ({ execute }));
jest.unstable_mockModule("@dwtechs/winstan", () => ({
  log: { info: jest.fn() },
}));
const { archiveTokensForPasswords } = await import(
  "../../src/services/token.js"
);

describe("archiveTokensForPasswords", () => {
  let consumer;
  let client;

  beforeEach(() => {
    jest.resetAllMocks();
    execute.mockResolvedValue({ rowCount: 2, rows: [] });
    consumer = { userId: 9, nickname: "archiver" };
    client = { query: jest.fn() };
  });

  it("should update all outstanding owner tokens with audit fields in the supplied transaction", async () => {
    await expect(
      archiveTokensForPasswords([1, 17], consumer, client),
    ).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledTimes(1);
    const [sql, args, dbClient] = execute.mock.calls[0];
    expect(args).toEqual([[1, 17], 9, "archiver"]);
    expect(dbClient).toBe(client);
    // Full WHERE assertion guards against extra archived-password, token-type,
    // expiry or verification predicates that would leave retry tokens usable.
    expect(sql.replace(/\s+/g, " ").trim()).toBe(
      'UPDATE token SET archived = TRUE, "archivedAt" = NOW(), "updatedAt" = NOW(), ' +
        '"updaterId" = $2, "updaterName" = $3 ' +
        'WHERE "userId" IN (SELECT "userId" FROM pwd WHERE id = ANY($1::int[])) ' +
        "AND archived IS NOT TRUE",
    );
  });

  it("should resolve repeated cleanup when no unarchived owner tokens remain", async () => {
    execute.mockResolvedValue({ rowCount: 0, rows: [] });
    await expect(
      archiveTokensForPasswords([17], consumer, null),
    ).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      expect.any(String),
      [[17], 9, "archiver"],
      null,
    );
  });

  it("should bind an empty password selection rather than broadening the owner scope", async () => {
    execute.mockResolvedValue({ rowCount: 0, rows: [] });
    await expect(
      archiveTokensForPasswords([], consumer, null),
    ).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("FROM pwd WHERE id = ANY($1::int[])"),
      [[], 9, "archiver"],
      null,
    );
  });

  it("should await the database update before resolving", async () => {
    let resolve;
    execute.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const settled = jest.fn();
    const pending = archiveTokensForPasswords([17], consumer, client).then(
      settled,
    );
    await new Promise(setImmediate);
    expect(execute).toHaveBeenCalledWith(
      expect.any(String),
      [[17], 9, "archiver"],
      client,
    );
    expect(settled).not.toHaveBeenCalled();
    resolve({ rowCount: 1 });
    await pending;
    expect(settled.mock.calls).toEqual([[undefined]]);
  });

  it("should propagate the database error so password archive can be retried", async () => {
    const error = new Error("update failed");
    execute.mockRejectedValue(error);
    await expect(
      archiveTokensForPasswords([17], consumer, client),
    ).rejects.toBe(error);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      expect.any(String),
      [[17], 9, "archiver"],
      client,
    );
  });
});
