// @ts-check
/**
 * Security-question catalog, enroll, verify — in-memory SQL mock.
 */
import { jest } from "@jest/globals";
import { createAuthDbMock } from "./helpers/auth-db-mock.js";

process.env.PWD_SECRET = "test-secret-for-unit-tests-only";

const db = createAuthDbMock();

jest.unstable_mockModule("@dwtechs/antity-pgsql", () => ({
  execute: (sql, params, tx) => db.execute(sql, params, tx),
  getCache: jest.fn(),
  query: { select: jest.fn(), update: jest.fn(), insert: jest.fn() },
}));

const {
  listSecurityQuestionCatalog,
  getSecurityQuestionsByIds,
  listEnrolledSecurityQuestions,
  emptyQuestionSlots,
  hashSecurityAnswer,
  saveSecurityAnswers,
  verifySecurityAnswers,
} = await import("../src/services/security-questions.js");

describe("security questions", () => {
  beforeEach(() => {
    db.reset();
    db.seedQuestion({
      id: 1,
      labelEn: "Pet name?",
      labelFr: "Nom d'animal ?",
    });
    db.seedQuestion({
      id: 2,
      labelEn: "City born?",
      labelFr: "Ville de naissance ?",
    });
    db.seedQuestion({
      id: 3,
      labelEn: "First school?",
    });
  });

  it("lists localized catalog and resolves ids", async () => {
    const en = await listSecurityQuestionCatalog("en");
    expect(en).toHaveLength(3);
    expect(en[0].label).toBe("Pet name?");

    const fr = await listSecurityQuestionCatalog("fr");
    expect(fr[0].label).toBe("Nom d'animal ?");
    expect(fr[2].label).toBe("First school?");

    expect(await getSecurityQuestionsByIds([3, 1], "en")).toEqual([
      { id: 3, label: "First school?" },
      { id: 1, label: "Pet name?" },
    ]);
    expect(await getSecurityQuestionsByIds([])).toEqual([]);
  });

  it("hashes answers to opaque digests (salted)", async () => {
    const a = await hashSecurityAnswer("  Fluffy  ");
    const b = await hashSecurityAnswer("fluffy");
    expect(a).not.toBe("fluffy");
    expect(b).not.toBe("fluffy");
    // hashitaka salts each encrypt; compare path is covered by verify below.
    expect(typeof a).toBe("string");
    expect(a.length).toBeGreaterThan(32);
  });

  it("saves, lists enrolled, and verifies answers", async () => {
    expect(emptyQuestionSlots()).toEqual([
      { slot: 1 },
      { slot: 2 },
      { slot: 3 },
    ]);

    await saveSecurityAnswers(10, [
      { questionId: 1, answer: "Fluffy" },
      { questionId: 2, answer: "Paris" },
    ]);

    const enrolled = await listEnrolledSecurityQuestions(10, "en");
    expect(enrolled).toEqual([
      { id: 1, label: "Pet name?" },
      { id: 2, label: "City born?" },
    ]);

    expect(
      await verifySecurityAnswers(10, [
        { questionId: 1, answer: "fluffy" },
        { questionId: 2, answer: "  Paris " },
      ]),
    ).toBe(true);

    expect(
      await verifySecurityAnswers(10, [
        { questionId: 1, answer: "wrong" },
        { questionId: 2, answer: "Paris" },
      ]),
    ).toBe(false);

    // Unknown question id → stored set size mismatch.
    expect(
      await verifySecurityAnswers(10, [
        { questionId: 1, answer: "Fluffy" },
        { questionId: 99, answer: "Nope" },
      ]),
    ).toBe(false);
    expect(await verifySecurityAnswers(10, [])).toBe(false);
  });

  it("replaces prior answers on re-enroll", async () => {
    await saveSecurityAnswers(5, [
      { questionId: 1, answer: "Old" },
      { questionId: 2, answer: "Keep" },
    ]);
    await saveSecurityAnswers(5, [
      { questionId: 1, answer: "New" },
      { questionId: 3, answer: "School" },
    ]);

    expect(
      await verifySecurityAnswers(5, [
        { questionId: 1, answer: "New" },
        { questionId: 3, answer: "School" },
      ]),
    ).toBe(true);
    expect(
      await verifySecurityAnswers(5, [
        { questionId: 1, answer: "Old" },
        { questionId: 2, answer: "Keep" },
      ]),
    ).toBe(false);

    const enrolled = await listEnrolledSecurityQuestions(5);
    expect(enrolled.map((q) => q.id).sort()).toEqual([1, 3]);
  });
});
