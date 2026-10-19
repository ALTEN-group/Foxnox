#!/bin/sh
set -e

# Optional runtime overrides (empty → {}). Injected into index.html so the
# browser can read them without baking Docker env into the Angular bundle.
node -e '
const fs = require("fs");
const path = "src/index.html";
const ssoTokenKey = (process.env.ADMIN_SSO_TOKEN_KEY || "").trim();
const rolesSearchUrl = (process.env.ADMIN_ROLES_SEARCH_URL || "").trim();
const payload = {
  ...(ssoTokenKey ? { ssoTokenKey } : {}),
  ...(rolesSearchUrl ? { rolesSearchUrl } : {}),
};
const script =
  "<script id=\"foxnox-admin-runtime\">window.__FOXNOX_ADMIN__=" +
  JSON.stringify(payload) +
  ";</script>";
let html = fs.readFileSync(path, "utf8");
html = html.replace(
  /<script id="foxnox-admin-runtime">[\s\S]*?<\/script>/,
  script,
);
fs.writeFileSync(path, html);
'

exec npm start
