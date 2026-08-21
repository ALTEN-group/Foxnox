// @ts-check
/**
 * In-memory stand-in for the SQL paths used by `src/services/token.js`.
 * Keeps integration tests free of Postgres while exercising the real
 * create → find → consume / bump lifecycle.
 */

/** @typedef {{ id: number, name: string, ttl: number, maxAttempts: number }} TokenType */

const DEFAULT_TYPES = /** @type {TokenType[]} */ ([
  { id: 1, name: "Password reset", ttl: 30, maxAttempts: 3 },
  { id: 2, name: "Account recovery", ttl: 30, maxAttempts: 3 },
  { id: 3, name: "Account unlock", ttl: 30, maxAttempts: 3 },
  { id: 4, name: "2FA challenge", ttl: 5, maxAttempts: 5 },
  { id: 5, name: "Expired password challenge", ttl: 5, maxAttempts: 5 },
  { id: 6, name: "Trusted device challenge", ttl: 5, maxAttempts: 5 },
]);

/**
 * @returns {{
 *   execute: (sql: string, params?: unknown[], _tx?: unknown) => Promise<{ rows: object[] }>,
 *   tokens: object[],
 *   reset: () => void,
 * }}
 */
export function createTokenDbMock() {
  let nextId = 1;
  /** @type {Map<string, TokenType>} */
  const typesByName = new Map(DEFAULT_TYPES.map((t) => [t.name, { ...t }]));
  /** @type {Array<{
   *   id: number,
   *   hash: string,
   *   typeId: number,
   *   userId: number,
   *   attempts: number,
   *   expiresAt: Date,
   *   verifiedAt: Date | null,
   *   archived: boolean,
   *   archivedAt: Date | null,
   * }>} */
  let tokens = [];

  function reset() {
    nextId = 1;
    tokens = [];
    for (const t of DEFAULT_TYPES) typesByName.set(t.name, { ...t });
  }

  /**
   * @param {string} sql
   * @param {unknown[]} [params]
   */
  async function execute(sql, params = []) {
    const q = String(sql).replace(/\s+/g, " ").trim();

    if (q.includes("FROM token_type") && q.includes("WHERE name = $1")) {
      const name = String(params[0]);
      const row = typesByName.get(name);
      return { rows: row ? [{ ...row }] : [] };
    }

    if (
      q.includes("UPDATE token") &&
      q.includes("archived = TRUE") &&
      q.includes('"verifiedAt" IS NULL') &&
      q.includes('"userId" = $1')
    ) {
      const userId = Number(params[0]);
      const typeId = Number(params[1]);
      for (const t of tokens) {
        if (
          t.userId === userId &&
          t.typeId === typeId &&
          !t.archived &&
          t.verifiedAt == null
        ) {
          t.archived = true;
          t.archivedAt = new Date();
        }
      }
      return { rows: [] };
    }

    if (q.includes("INSERT INTO token")) {
      const hash = String(params[0]);
      const typeId = Number(params[1]);
      const userId = Number(params[2]);
      const expiresAt = new Date(String(params[3]));
      const row = {
        id: nextId++,
        hash,
        typeId,
        userId,
        attempts: 0,
        expiresAt,
        verifiedAt: null,
        archived: false,
        archivedAt: null,
      };
      tokens.push(row);
      return { rows: [{ id: row.id, expiresAt: row.expiresAt }] };
    }

    if (q.includes("FROM token t") && q.includes("t.hash = $2")) {
      const typeId = Number(params[0]);
      const hash = String(params[1]);
      const now = Date.now();
      const row = tokens.find(
        (t) =>
          t.typeId === typeId &&
          !t.archived &&
          t.verifiedAt == null &&
          t.expiresAt.getTime() > now &&
          t.hash === hash,
      );
      return {
        rows: row
          ? [
              {
                id: row.id,
                userId: row.userId,
                attempts: row.attempts,
                expiresAt: row.expiresAt,
                hash: row.hash,
              },
            ]
          : [],
      };
    }

    if (
      q.includes("UPDATE token") &&
      q.includes('"verifiedAt" = NOW()') &&
      q.includes("WHERE id = $1")
    ) {
      const id = Number(params[0]);
      const row = tokens.find((t) => t.id === id);
      if (row) {
        row.verifiedAt = new Date();
        row.archived = true;
        row.archivedAt = new Date();
      }
      return { rows: [] };
    }

    if (
      q.includes("UPDATE token") &&
      q.includes("attempts = attempts + 1") &&
      q.includes("WHERE id = $1")
    ) {
      const id = Number(params[0]);
      const row = tokens.find((t) => t.id === id);
      if (row) row.attempts += 1;
      return { rows: [] };
    }

    throw new Error(`Unhandled SQL in token db mock: ${q.slice(0, 160)}`);
  }

  return {
    execute,
    get tokens() {
      return tokens;
    },
    reset,
  };
}
