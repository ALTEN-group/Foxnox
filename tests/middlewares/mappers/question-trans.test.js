/** @jest-environment node */
// @ts-check
import { jest } from "@jest/globals";

const execute = jest.fn();

jest.unstable_mockModule("@dwtechs/antity-pgsql", () => ({ execute }));

const {
  attachTranslations,
  exposeTranslationFields,
  mergeSaveHistory,
  persistTranslations,
} = await import(
  "../../../src/middlewares/mappers/question-trans.js"
);

beforeEach(() => {
  execute.mockReset();
  execute.mockResolvedValue({ rows: [] });
});

describe("attachTranslations", () => {
  it("adds transEn / transFr to each row, empty when missing", async () => {
    execute.mockResolvedValue({
      rows: [
        { questionId: 1, lang: "en", trans: "Pet?" },
        { questionId: 1, lang: "fr", trans: "Animal ?" },
        { questionId: 2, lang: "en", trans: "School?" },
      ],
    });
    const res = { locals: { rows: [{ id: 1 }, { id: 2 }, { id: 3 }] } };
    const next = jest.fn();
    await attachTranslations(/** @type {any} */ ({}), /** @type {any} */ (res), next);
    expect(res.locals.rows).toEqual([
      { id: 1, transEn: "Pet?", transFr: "Animal ?" },
      { id: 2, transEn: "School?", transFr: "" },
      { id: 3, transEn: "", transFr: "" },
    ]);
    expect(execute.mock.calls[0][1]).toEqual([[1, 2, 3], ["en", "fr"]]);
    expect(next).toHaveBeenCalledWith();
  });

  it("skips the query when there is no row", async () => {
    const res = { locals: { rows: [] } };
    const next = jest.fn();
    await attachTranslations(/** @type {any} */ ({}), /** @type {any} */ (res), next);
    expect(execute).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it("forwards database errors", async () => {
    const err = new Error("db down");
    execute.mockRejectedValue(err);
    const res = { locals: { rows: [{ id: 1 }] } };
    const next = jest.fn();
    await attachTranslations(/** @type {any} */ ({}), /** @type {any} */ (res), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe("persistTranslations", () => {
  const CONSUMER = { userId: 7, nickname: "admin" };

  it("writes only what changed, then touches the questions for their history", async () => {
    execute
      .mockResolvedValueOnce({
        rows: [
          { questionId: 4, lang: "en", trans: "Pet?" },
          { questionId: 4, lang: "fr", trans: "Animal ?" },
          { questionId: 5, lang: "en", trans: "School?" },
        ],
      })
      .mockResolvedValue({ rows: [] });
    const res = {
      locals: {
        consumer: CONSUMER,
        rows: [
          { id: 4, transEn: " Pet? ", transFr: null },
          { id: 5, transEn: "School?", transFr: "École ?" },
        ],
      },
    };
    const next = jest.fn();
    await persistTranslations(/** @type {any} */ ({}), /** @type {any} */ (res), next);
    expect(execute).toHaveBeenCalledTimes(4);
    const [upsertSql, upsertArgs] = execute.mock.calls[1];
    expect(upsertSql).toContain("ON CONFLICT");
    expect(upsertArgs).toEqual([[5], ["fr"], ["École ?"]]);
    const [deleteSql, deleteArgs] = execute.mock.calls[2];
    expect(deleteSql).toContain("DELETE FROM security_question_trans");
    expect(deleteArgs).toEqual([[4], ["fr"]]);
    const [touchSql, touchArgs] = execute.mock.calls[3];
    expect(touchSql).toContain("UPDATE security_question");
    expect(touchArgs).toEqual([[5, 4], 7, "admin"]);
    expect(next).toHaveBeenCalledWith();
  });

  it("does not write nor touch anything when nothing changed", async () => {
    execute.mockResolvedValueOnce({
      rows: [{ questionId: 4, lang: "en", trans: "Pet?" }],
    });
    const res = {
      locals: {
        consumer: CONSUMER,
        rows: [{ id: 4, transEn: "Pet?", transFr: "" }],
      },
    };
    const next = jest.fn();
    await persistTranslations(/** @type {any} */ ({}), /** @type {any} */ (res), next);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("leaves untouched the languages absent from the row", async () => {
    const res = { locals: { consumer: CONSUMER, rows: [{ id: 4, active: false }] } };
    const next = jest.fn();
    await persistTranslations(/** @type {any} */ ({}), /** @type {any} */ (res), next);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});

describe("exposeTranslationFields", () => {
  it("marks only the translation fields as selectable, insertable and updatable", () => {
    const res = {
      locals: {
        rows: [
          { key: "question", operations: ["SELECT", "INSERT", "UPDATE"] },
          { key: "transEn", operations: [] },
          { key: "transFr", operations: [] },
          { key: "id", operations: ["SELECT"] },
        ],
      },
    };
    const next = jest.fn();
    exposeTranslationFields(/** @type {any} */ ({}), /** @type {any} */ (res), next);
    expect(res.locals.rows.map((r) => r.operations)).toEqual([
      ["SELECT", "INSERT", "UPDATE"],
      ["SELECT", "INSERT", "UPDATE"],
      ["SELECT", "INSERT", "UPDATE"],
      ["SELECT"],
    ]);
    expect(next).toHaveBeenCalledWith();
  });
});

describe("mergeSaveHistory", () => {
  const entry = (id, operation, userId, tstamp, record) => ({
    id,
    operation,
    userId,
    tstamp: new Date(tstamp),
    record,
  });
  const run = (rows) => {
    const res = { locals: { rows, total: rows.length } };
    const next = jest.fn();
    mergeSaveHistory(/** @type {any} */ ({}), /** @type {any} */ (res), next);
    return { res, next };
  };

  it("merges the entries of one save into a single one with the final snapshot", () => {
    const { res, next } = run([
      entry(1, "INSERT", -1, "2026-10-22T10:00:00.000Z", { transEn: "" }),
      entry(2, "UPDATE", 7, "2026-10-22T11:00:00.000Z", { transEn: "old" }),
      entry(3, "UPDATE", 7, "2026-10-22T11:00:00.120Z", { transEn: "new" }),
    ]);
    expect(res.locals.rows).toHaveLength(2);
    expect(res.locals.rows[1]).toMatchObject({
      id: 2,
      operation: "UPDATE",
      record: { transEn: "new" },
    });
    expect(res.locals.total).toBe(2);
    expect(next).toHaveBeenCalledWith();
  });

  it("keeps apart distinct saves and distinct authors", () => {
    const { res } = run([
      entry(1, "INSERT", -1, "2026-10-22T10:00:00.000Z", {}),
      entry(2, "UPDATE", 7, "2026-10-22T11:00:00.000Z", { a: 1 }),
      entry(3, "UPDATE", 8, "2026-10-22T11:00:00.100Z", { a: 2 }),
      entry(4, "UPDATE", 8, "2026-10-22T11:05:00.000Z", { a: 3 }),
    ]);
    expect(res.locals.rows.map((r) => r.id)).toEqual([1, 2, 3, 4]);
  });

  it("answers 404 when a creation is the only entry left", () => {
    const { next } = run([
      entry(1, "INSERT", 7, "2026-10-22T11:00:00.000Z", { transEn: "" }),
      entry(2, "UPDATE", 7, "2026-10-22T11:00:00.100Z", { transEn: "Pet?" }),
    ]);
    expect(next).toHaveBeenCalledWith({
      statusCode: 404,
      message: "history not found",
    });
  });
});
