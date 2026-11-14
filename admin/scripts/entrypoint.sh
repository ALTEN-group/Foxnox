#!/bin/sh
set -e

# Optional runtime overrides (empty → {}). Injected into a generated
# src/index.dev.html (gitignored, used by the "serve" build config in
# angular.json) so the tracked src/index.html template stays untouched and the
# browser can read them without baking Docker env into the Angular bundle.
node -e '
const fs = require("fs");
const template = "src/index.html";
const output = "src/index.dev.html";
const ssoTokenKey = (process.env.ADMIN_SSO_TOKEN_KEY || "").trim();
const rolesSearchUrl = (process.env.ADMIN_ROLES_SEARCH_URL || "").trim();
const apiUsers = (process.env.ADMIN_API_USERS || "").trim();
const payload = {
  ...(ssoTokenKey ? { ssoTokenKey } : {}),
  ...(rolesSearchUrl ? { rolesSearchUrl } : {}),
  ...(apiUsers ? { apiUsers } : {}),
};
const script =
  "<script id=\"foxnox-admin-runtime\">window.__FOXNOX_ADMIN__=" +
  JSON.stringify(payload) +
  ";</script>";
let html = fs.readFileSync(template, "utf8");
html = html.replace(
  /<script id="foxnox-admin-runtime">[\s\S]*?<\/script>/,
  script,
);
fs.writeFileSync(output, html);
'

exec npm start
