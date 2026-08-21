// @ts-check
import { WEB_PUBLIC_BASE } from "./engine.js";

/**
 * Absolute public origin for email deep links
 * (e.g. http://localhost:8100 — Traefik, no path).
 */
export function getPublicOrigin() {
  const fromEnv = process.env.WEB_PUBLIC_ORIGIN?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const scheme = process.env.SERVER_SCHEME || "http://";
  const host = process.env.SERVER_URL || "localhost";
  const port = process.env.TRAEFIK_PORT || process.env.WEB_PUBLIC_PORT || "8100";
  return `${scheme}${host}:${port}`.replace(/\/$/, "");
}

/**
 * Browser path prefix for workflows (`/api/pwd/web`).
 */
export function getPublicWebBase() {
  return WEB_PUBLIC_BASE;
}

/**
 * Build an absolute deep link into a workflow page.
 *
 * @param {string} path relative to web base, e.g. `/recover/reset`
 * @param {Record<string, string | undefined>} [query]
 * @returns {string}
 */
export function buildDeepLink(path, query = {}) {
  const base = `${getPublicOrigin()}${getPublicWebBase()}`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${normalized}`);
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== "") url.searchParams.set(key, value);
  }
  return url.toString();
}
