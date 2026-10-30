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
 *   sqSelect: (...args: unknown[]) => { query: string, args: unknown[] },
 *   esaSelect: (...args: unknown[]) => { query: string, args: unknown[] },
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
      trans: {
        ...(row.labelEn ? { en: row.labelEn } : {}),
        ...(row.labelFr ? { fr: row.labelFr } : {}),
      },
    };
    questions.push(q);
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
      query: "__PWD_SELECT__",
      args: [filters.userId?.value, filters.archived?.value],
    };
  }

  /**
   * @param {unknown} _offset
   * @param {unknown} _limit
   * @param {unknown} _orderBy
   * @param {unknown} _order
   * @param {Record<string, { value: unknown }>} filters
   */
  function sqSelect(_offset, _limit, _orderBy, _order, filters) {
    return {
      query: "__SQ_SELECT__",
      args: [filters.active?.value, filters.archived?.value, filters.id?.value],
    };
  }

  /**
   * @param {unknown} _offset
   * @param {unknown} limit
   * @param {unknown} _orderBy
   * @param {unknown} _order
   * @param {Record<string, { value: unknown }>} filters
   */
  function esaSelect(_offset, limit, _orderBy, _order, filters) {
    return { query: "__ESA_SELECT__", args: [filters.userId?.value, limit] };
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

    if (sql === "__PWD_SELECT__") {
      const userId = Number(params[0]);
      const archived = params[1];
      const row = pwds.find(
        (p) =>
          p.userId === userId &&
          (archived === undefined || p.archived === archived),
      );
      return { rows: row ? [{ ...row }] : [], rowCount: row ? 1 : 0 };
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

    // resetFailedAttempts
    if (
      q.includes("UPDATE pwd") &&
      q.includes('"failedAttempts" = 0') &&
      q.includes('"lastLoginAt" = NOW()')
    ) {
      const id = Number(params[0]);
      const row = pwds.find((p) => p.id === id);
      if (row) {
        row.failedAttempts = 0;
        row.lockedUntil = null;
        row.lastLoginAt = new Date();
      }
      return { rows: [], rowCount: row ? 1 : 0 };
    }

    // recordLastLogin
    if (
      q.includes("UPDATE pwd") &&
      q.includes('"lastLoginAt" = NOW()')
    ) {
      const id = Number(params[0]);
      const row = pwds.find((p) => p.id === id);
      if (row) {
        row.lastLoginAt = new Date();
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

    // listSecurityQuestionCatalog, getSecurityQuestionsByIds
    if (sql === "__SQ_SELECT__") {
      const [active, archived, ids] = params;
      const rows = questions
        .filter((qq) => active === undefined || qq.active === active)
        .filter((qq) => archived === undefined || qq.archived === archived)
        .filter((qq) => !ids || ids.includes(qq.id))
        .map((qq) => ({ ...qq }));
      return { rows };
    }

    // enrolled_security_answer view: hasEnrolledSecurityAnswers,
    // listEnrolledSecurityQuestions, verifySecurityAnswers
    if (sql === "__ESA_SELECT__") {
      const [userId, limit] = params;
      const rows = answers
        .filter((a) => a.userId === Number(userId) && !a.archived)
        .map((a) => {
          const qq = questions.find((qrow) => qrow.id === a.questionId);
          return {
            id: a.id,
            userId: a.userId,
            questionId: a.questionId,
            answerHash: a.answerHash,
            question: qq?.question ?? `Q${a.questionId}`,
            trans: qq?.trans ?? {},
          };
        });
      return { rows: limit ? rows.slice(0, limit) : rows };
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

    throw new Error(`Unhandled SQL in auth db mock: ${q.slice(0, 180)}`);
  }

  return {
    execute,
    seedPwd,
    seedPolicy,
    seedQuestion,
    getPolicyCache,
    pwdSelect,
    sqSelect,
    esaSelect,
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
