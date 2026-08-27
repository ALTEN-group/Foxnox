// @ts-check

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "@dwtechs/winstan";
import express from "express";

const ADMIN_DIST = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "..",
  "admin-dist",
);

/**
 * @param {string | undefined} value
 * @returns {string}
 */
export function normalizeAdminBasePath(value) {
  const path = (value || "/foxnox").trim().replace(/\/+$/, "");
  if (!/^\/[A-Za-z0-9._~/-]*$/.test(path) || path.includes("//")) {
    throw new Error("ADMIN_BASE_PATH must be a valid absolute URL path");
  }
  return path;
}

/**
 * @param {string} indexHtml
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function renderAdminIndex(indexHtml, env = process.env) {
  const basePath = normalizeAdminBasePath(env.ADMIN_BASE_PATH);
  const ssoTokenKey = env.ADMIN_SSO_TOKEN_KEY?.trim() || "";
  const payload = JSON.stringify({
    ...(ssoTokenKey ? { ssoTokenKey } : {}),
  }).replaceAll("<", "\\u003c");

  return indexHtml
    .replace(/<base href="[^"]*">/, `<base href="${basePath}/">`)
    .replace(
      /<script id="foxnox-admin-runtime">[\s\S]*?<\/script>/,
      `<script id="foxnox-admin-runtime">window.__FOXNOX_ADMIN__=${payload};</script>`,
    );
}

/**
 * Starts the bundled Angular admin UI on its dedicated internal port.
 *
 * @returns {import("node:http").Server | undefined}
 */
export function startAdminServer() {
  const { ADMIN_PORT } = process.env;
  if (!ADMIN_PORT) return undefined;

  const basePath = normalizeAdminBasePath(process.env.ADMIN_BASE_PATH);
  const indexHtml = renderAdminIndex(
    readFileSync(join(ADMIN_DIST, "index.html"), "utf8"),
  );
  const app = express();
  app.disable("x-powered-by");

  app.get("/healthz", (_req, res) => res.status(200).send("ok"));
  app.use(basePath, express.static(ADMIN_DIST, { index: false }));
  app.get([basePath, `${basePath}/`, `${basePath}/*path`], (_req, res) => {
    res.type("html").send(indexHtml);
  });

  return app.listen(Number(ADMIN_PORT), () =>
    log.info(`Admin UI listening on port ${ADMIN_PORT}`),
  );
}
