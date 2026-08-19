// @ts-check
/**
 * In-memory stand-in for SQL used by pwd / trusted-devices / security-questions
 * services. Entity query builders are replaced with sentinels so tests stay
 * free of Postgres while exercising real service logic.
 */

/**
 * @returns {{
 *   execute: (sql: string, params?: unknown[], _tx?: unknown) => Promise<{ rows: object[], rowCount?: number }>,
 *   seedPwd: (row: object) => object,
 *   seedPolicy: (row: object|null) => void,
 *   seedQuestion: (row: object) => object,
 *   getPolicyCache: () => Promise<object[]>,
 *   pwdSelect: (...args: unknown[]) => { query: string, args: unknown[] },
 *   pwdUpdate: (rows: object[]) => { query: string, args: unknown[] },
 *   pwds: object[],
 *   devices: object[],
 *   answers: object[],
 *   reset: () => void,
 * }}
 */
export function createAuthDbMock() {
  let nextPwdId = 1;
  let nextDeviceId = 1;
  let nextAnswerId = 1;
  let nextQuestionId = 1;

  /** @type {object[]} */
  let pwds = [];
  /** @type {object|null} */
  let policy = null;
  /** @type {object[]} */
  let devices = [];
  /** @type {object[]} */
  let questions = [];
  /** @type {object[]} */
  let translations = [];
  /** @type {object[]} */
  let answers = [];

  function reset() {
    nextPwdId = 1;
    nextDeviceId = 1;
    nextAnswerId = 1;
    nextQuestionId = 1;
    pwds = [];
    policy = null;
    devices = [];
    questions = [];
    translations = [];
    answers = [];
  }

  /**
   * @param {object} row
   */
  function seedPwd(row) {
    const full = {
      id: nextPwdId++,
      userId: row.userId,
      pwdHash: row.pwdHash ?? null,
      pwdUpdatedAt: row.pwdUpdatedAt ?? null,
      pwdExpiry: row.pwdExpiry ?? null,
      failedAttempts: row.failedAttempts ?? 0,
      lockedUntil: row.lockedUntil ?? null,
      lastLoginAt: row.lastLoginAt ?? null,
      twoFactorEnabled: row.twoFactorEnabled ?? false,
      twoFactorSecret: row.twoFactorSecret ?? null,
      archived: row.archived ?? false,
    };
    pwds.push(full);
    return full;
  }

  /**
   * @param {object|null} row
   */
  function seedPolicy(row) {
    policy = row
      ? {
          id: row.id ?? 1,
          length: row.length ?? 12,
          number: row.number ?? true,
          symbol: row.symbol ?? true,
          lowerCase: row.lowerCase ?? true,
          upperCase: row.upperCase ?? true,
          expiryDays: row.expiryDays ?? 0,
          active: row.active ?? true,
          archived: false,
        }
      : null;
  }

  /**
   * @param {object} row
   */
  function seedQuestion(row) {
    const q = {
      id: row.id ?? nextQuestionId++,
      categoryId: row.categoryId ?? 1,
      question: row.question ?? `Q${row.id ?? nextQuestionId}`,
      active: row.active ?? true,
      archived: row.archived ?? false,
    };
    questions.push(q);
    if (row.labelEn || row.labelFr) {
      if (row.labelEn) {
        translations.push({ questionId: q.id, lang: "en", trans: row.labelEn });
      }
      if (row.labelFr) {
        translations.push({ questionId: q.id, lang: "fr", trans: row.labelFr });
      }
    }
    return q;
  }

  async function getPolicyCache() {
    return policy && policy.active && !policy.archived ? [{ ...policy }] : [];
  }

  /**
   * @param {unknown} _offset
   * @param {unknown} _limit
   * @param {unknown} _orderBy
   * @param {unknown} _order
   * @param {{ userId?: { value: number }, archived?: { value: boolean } }} filters
   */
  function pwdSelect(_offset, _limit, _orderBy, _order, filters) {
    return {
      query: "__PWD_FIND_ID__",
      args: [filters.userId?.value, filters.archived?.value],
    };
  }

  /**
   * @param {object[]} rows
   */
  function pwdUpdate(rows) {
    return { query: "__PWD_UPDATE__", args: [rows[0]] };
  }

  /**
   * @param {string} sql
   * @param {unknown[]} [params]
   */
  async function execute(sql, params = []) {
    const q = String(sql).replace(/\s+/g, " ").trim();

    if (sql === "__PWD_FIND_ID__") {
      const userId = Number(params[0]);
      const archived = params[1];
      const row = pwds.find(
        (p) =>
          p.userId === userId &&
          (archived === undefined || p.archived === archived),
      );
      return { rows: row ? [{ id: row.id }] : [], rowCount: row ? 1 : 0 };
    }

    if (sql === "__PWD_UPDATE__") {
      const patch = /** @type {Record<string, unknown>} */ (params[0]);
      const row = pwds.find((p) => p.id === Number(patch.id));
      if (!row) return { rows: [], rowCount: 0 };
      for (const [k, v] of Object.entries(patch)) {
        if (k === "id") continue;
        row[k] = v;
      }
      return { rows: [], rowCount: 1 };
    }

    // getPwdAuthState
    if (
      q.includes('SELECT id, "userId", "twoFactorEnabled"') &&
      q.includes("FROM pwd")
    ) {
      const userId = Number(params[0]);
      const row = pwds.find((p) => p.userId === userId && !p.archived);
      return {
        rows: row
          ? [
              {
                id: row.id,
                userId: row.userId,
                twoFactorEnabled: row.twoFactorEnabled,
                pwdExpiry: row.pwdExpiry,
                lockedUntil: row.lockedUntil,
                failedAttempts: row.failedAttempts,
              },
            ]
          : [],
      };
    }

    // getTwoFactorSecret
    if (q.includes('SELECT "twoFactorSecret"') && q.includes("FROM pwd")) {
      const userId = Number(params[0]);
      const row = pwds.find((p) => p.userId === userId && !p.archived);
      return {
        rows: row ? [{ twoFactorSecret: row.twoFactorSecret }] : [],
      };
    }

    // disableTwoFactor
    if (
      q.includes("UPDATE pwd") &&
      q.includes('"twoFactorSecret" = NULL') &&
      q.includes('"twoFactorEnabled" = FALSE')
    ) {
      const id = Number(params[0]);
      const row = pwds.find((p) => p.id === id);
      if (row) {
        row.twoFactorSecret = null;
        row.twoFactorEnabled = false;
      }
      return { rows: [], rowCount: row ? 1 : 0 };
    }

    // createTrustedDevice
    if (q.includes("INSERT INTO user_trusted_device")) {
      const row = {
        id: nextDeviceId++,
        userId: Number(params[0]),
        deviceTokenHash: String(params[1]),
        deviceName: params[2] == null ? null : String(params[2]),
        ipAddress: params[3] == null ? null : String(params[3]),
        userAgent: params[4] == null ? null : String(params[4]),
        expiresAt: new Date(String(params[5])),
        lastUsedAt: new Date(),
        archived: false,
      };
      devices.push(row);
      return { rows: [{ id: row.id }], rowCount: 1 };
    }

    // verifyTrustedDevice (lookup)
    if (
      q.includes("SELECT id FROM user_trusted_device") &&
      q.includes('"deviceTokenHash" = $2')
    ) {
      const userId = Number(params[0]);
      const hash = String(params[1]);
      const now = Date.now();
      const row = devices.find(
        (d) =>
          d.userId === userId &&
          d.deviceTokenHash === hash &&
          !d.archived &&
          d.expiresAt.getTime() > now,
      );
      return { rows: row ? [{ id: row.id }] : [] };
    }

    // verifyTrustedDevice (touch lastUsedAt)
    if (
      q.includes("UPDATE user_trusted_device") &&
      q.includes('"lastUsedAt" = NOW()') &&
      q.includes("WHERE id = $1")
    ) {
      const id = Number(params[0]);
      const row = devices.find((d) => d.id === id);
      if (row) row.lastUsedAt = new Date();
      return { rows: [], rowCount: row ? 1 : 0 };
    }

    // listTrustedDevices
    if (
      q.includes('SELECT id, "deviceName", "lastUsedAt", "expiresAt"') &&
      q.includes("FROM user_trusted_device")
    ) {
      const userId = Number(params[0]);
      const rows = devices
        .filter((d) => d.userId === userId && !d.archived)
        .sort((a, b) => {
          const at = a.lastUsedAt?.getTime?.() ?? 0;
          const bt = b.lastUsedAt?.getTime?.() ?? 0;
          return bt - at || b.id - a.id;
        });
      return { rows };
    }

    // archiveTrustedDevice
    if (
      q.includes("UPDATE user_trusted_device") &&
      q.includes("archived = TRUE") &&
      q.includes("WHERE id = $1 AND \"userId\" = $2")
    ) {
      const id = Number(params[0]);
      const userId = Number(params[1]);
      const row = devices.find(
        (d) => d.id === id && d.userId === userId && !d.archived,
      );
      if (row) {
        row.archived = true;
        row.archivedAt = new Date();
      }
      return { rows: [], rowCount: row ? 1 : 0 };
    }

    // listSecurityQuestionCatalog
    if (
      q.includes("FROM security_question q") &&
      q.includes("q.active IS TRUE") &&
      q.includes("q.archived IS NOT TRUE")
    ) {
      const locale = String(params[0]);
      const rows = questions
        .filter((qq) => qq.active && !qq.archived)
        .map((qq) => {
          const local = translations.find(
            (t) => t.questionId === qq.id && t.lang === locale,
          );
          const en = translations.find(
            (t) => t.questionId === qq.id && t.lang === "en",
          );
          return {
            id: qq.id,
            categoryId: qq.categoryId,
            label: local?.trans ?? en?.trans ?? qq.question,
          };
        });
      return { rows };
    }

    // getSecurityQuestionsByIds
    if (
      q.includes("FROM security_question q") &&
      q.includes("WHERE q.id = ANY($2::int[])")
    ) {
      const locale = String(params[0]);
      const ids = /** @type {number[]} */ (params[1]);
      const rows = ids
        .map((id) => questions.find((qq) => qq.id === id))
        .filter(Boolean)
        .map((qq) => {
          const local = translations.find(
            (t) => t.questionId === qq.id && t.lang === locale,
          );
          const en = translations.find(
            (t) => t.questionId === qq.id && t.lang === "en",
          );
          return {
            id: qq.id,
            label: local?.trans ?? en?.trans ?? qq.question,
          };
        });
      return { rows };
    }

    // listEnrolledSecurityQuestions
    if (
      q.includes("FROM user_security_answer a") &&
      q.includes('JOIN security_question q ON q.id = a."questionId"')
    ) {
      const locale = String(params[0]);
      const userId = Number(params[1]);
      const rows = answers
        .filter((a) => a.userId === userId && !a.archived)
        .map((a) => {
          const qq = questions.find((qrow) => qrow.id === a.questionId);
          const local = translations.find(
            (t) => t.questionId === a.questionId && t.lang === locale,
          );
          const en = translations.find(
            (t) => t.questionId === a.questionId && t.lang === "en",
          );
          return {
            id: a.questionId,
            label: local?.trans ?? en?.trans ?? qq?.question ?? `Q${a.questionId}`,
          };
        });
      return { rows };
    }

    // saveSecurityAnswers — archive prior
    if (
      q.includes("UPDATE user_security_answer") &&
      q.includes("archived = TRUE") &&
      q.includes('WHERE "userId" = $1')
    ) {
      const userId = Number(params[0]);
      for (const a of answers) {
        if (a.userId === userId && !a.archived) {
          a.archived = true;
          a.archivedAt = new Date();
        }
      }
      return { rows: [], rowCount: 0 };
    }

    // saveSecurityAnswers — upsert
    if (q.includes("INSERT INTO user_security_answer")) {
      const userId = Number(params[0]);
      const questionId = Number(params[1]);
      const answerHash = String(params[2]);
      const existing = answers.find(
        (a) => a.userId === userId && a.questionId === questionId,
      );
      if (existing) {
        existing.answerHash = answerHash;
        existing.archived = false;
        existing.archivedAt = null;
      } else {
        answers.push({
          id: nextAnswerId++,
          userId,
          questionId,
          answerHash,
          archived: false,
          archivedAt: null,
        });
      }
      return { rows: [], rowCount: 1 };
    }

    // verifySecurityAnswers
    if (
      q.includes('SELECT "questionId", "answerHash"') &&
      q.includes("FROM user_security_answer")
    ) {
      const userId = Number(params[0]);
      const ids = /** @type {number[]} */ (params[1]);
      const rows = answers
        .filter(
          (a) =>
            a.userId === userId &&
            !a.archived &&
            ids.includes(a.questionId),
        )
        .map((a) => ({
          questionId: a.questionId,
          answerHash: a.answerHash,
        }));
      return { rows };
    }

    throw new Error(`Unhandled SQL in auth db mock: ${q.slice(0, 180)}`);
  }

  return {
    execute,
    seedPwd,
    seedPolicy,
    seedQuestion,
    getPolicyCache,
    pwdSelect,
    pwdUpdate,
    get pwds() {
      return pwds;
    },
    get devices() {
      return devices;
    },
    get answers() {
      return answers;
    },
    reset,
  };
}
