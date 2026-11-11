/** @jest-environment node */
import { jest } from "@jest/globals";

const archiveTokensForPasswords = jest.fn();
jest.unstable_mockModule("../../../src/services/token.js", () => ({
  archiveTokensForPasswords,
}));
const { archivePwdTokens } = await import(
  "../../../src/middlewares/mappers/archive-pwd-tokens.js"
);

describe("archivePwdTokens", () => {
  let consumer;
  let client;
  let res;
  let next;

  beforeEach(() => {
    jest.resetAllMocks();
    archiveTokensForPasswords.mockResolvedValue(undefined);
    consumer = { userId: 1, nickname: "admin" };
    client = { query: jest.fn() };
    res = { locals: { consumer, dbClient: client } };
    next = jest.fn();
  });

  it.each([
    [[1, 7]],
    [[{ id: 1 }, { id: 7 }]],
    [["1", { id: "7" }, 7, { id: 1 }, "07"]],
  ])("should normalize and dedupe password rows %j", async (rows) => {
    await archivePwdTokens({ body: { rows } }, res, next);
    expect(archiveTokensForPasswords).toHaveBeenCalledTimes(1);
    expect(archiveTokensForPasswords).toHaveBeenCalledWith(
      [1, 7],
      consumer,
      client,
    );
    expect(next.mock.calls).toEqual([[]]);
  });

  it.each([undefined, null])(
    "should use null when the DB client is %j",
    async (dbClient) => {
      res.locals.dbClient = dbClient;
      await archivePwdTokens({ body: { rows: [1] } }, res, next);
      expect(archiveTokensForPasswords).toHaveBeenCalledWith(
        [1],
        consumer,
        null,
      );
      expect(next.mock.calls).toEqual([[]]);
    },
  );

  it.each([
    undefined,
    null,
    {},
    { rows: [] },
    { rows: null },
    { rows: {} },
    { rows: "1" },
  ])("should reject missing or non-array rows in %j", async (body) => {
    await archivePwdTokens({ body }, res, next);
    expect(archiveTokensForPasswords).not.toHaveBeenCalled();
    expect(next.mock.calls).toEqual([
      [
        {
          statusCode: 400,
          message: "Missing rows in req.body",
        },
      ],
    ]);
  });

  it.each([
    null,
    undefined,
    {},
    0,
    -1,
    1.5,
    "",
    "bad",
    true,
    [],
    { id: null },
    { id: 0 },
    { id: -1 },
    { id: 1.5 },
    { id: "bad" },
  ])(
    "should reject invalid password ID %j without partial cleanup",
    async (id) => {
      await archivePwdTokens({ body: { rows: [1, id] } }, res, next);
      expect(archiveTokensForPasswords).not.toHaveBeenCalled();
      expect(next.mock.calls).toEqual([
        [
          {
            statusCode: 400,
            message: "Invalid password id for archive",
          },
        ],
      ]);
    },
  );

  it("should wait for token invalidation before allowing password archive", async () => {
    let resolve;
    archiveTokensForPasswords.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const pending = archivePwdTokens({ body: { rows: [7] } }, res, next);

    expect(archiveTokensForPasswords).toHaveBeenCalledWith(
      [7],
      consumer,
      client,
    );
    expect(next).not.toHaveBeenCalled();
    resolve();
    await pending;
    expect(next.mock.calls).toEqual([[]]);
  });

  it("should forward the exact cleanup error without allowing archive to proceed", async () => {
    const error = new Error("database unavailable");
    archiveTokensForPasswords.mockRejectedValue(error);
    await archivePwdTokens({ body: { rows: [{ id: 7 }] } }, res, next);
    expect(archiveTokensForPasswords).toHaveBeenCalledWith(
      [7],
      consumer,
      client,
    );
    expect(next.mock.calls).toEqual([[error]]);
    expect(next.mock.calls[0][0]).toBe(error);
  });
});
