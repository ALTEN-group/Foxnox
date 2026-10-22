const webBase = (
  process.env.E2E_BASE_URL ?? "http://localhost:8100/api/foxnox/web/"
).replace(/\/?$/, "/");

/** Origin the browser talks to (Traefik, as seen from the browser). */
export const ORIGIN = new URL(webBase).origin;

/**
 * Direct, in-network access used only to prepare state and to read emails —
 * the same shortcut scripts/setup-mocks.sh takes. Never used to assert behaviour.
 */
export const FOXNOX_URL = process.env.E2E_FOXNOX_URL ?? "http://localhost:3000";
export const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? "http://localhost:8025";

/** One-off password per run; satisfies the default policy (12+, upper/lower/digit/symbol). */
export const PASSWORD =
  process.env.E2E_WEB_PASSWORD ??
  `Aa1!${Buffer.from(crypto.getRandomValues(new Uint8Array(12))).toString("hex")}`;

export const NEW_PASSWORD = `${PASSWORD}-new`;
