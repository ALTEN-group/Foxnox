/** @jest-environment node */
// @ts-check

import {
  normalizeAdminBasePath,
  renderAdminIndex,
} from "../src/admin-server.js";

const indexHtml = `<!doctype html>
<html>
  <head>
    <base href="/foxnox/">
    <script id="foxnox-admin-runtime">window.__FOXNOX_ADMIN__={};</script>
  </head>
</html>`;

describe("bundled admin server", () => {
  it("normalizes the configured admin base path", () => {
    expect(normalizeAdminBasePath("/accounts/")).toBe("/accounts");
    expect(normalizeAdminBasePath(undefined)).toBe("/foxnox");
  });

  it("rejects base paths that could inject markup", () => {
    expect(() => normalizeAdminBasePath('/foxnox"><script>')).toThrow(
      "ADMIN_BASE_PATH must be a valid absolute URL path",
    );
  });

  it("injects the runtime base path and SSO token key", () => {
    const rendered = renderAdminIndex(indexHtml, {
      ADMIN_BASE_PATH: "/accounts",
      ADMIN_SSO_TOKEN_KEY: "shared_access_token",
    });

    expect(rendered).toContain('<base href="/accounts/">');
    expect(rendered).toContain(
      'window.__FOXNOX_ADMIN__={"ssoTokenKey":"shared_access_token"};',
    );
  });

  it("escapes script-closing sequences in runtime configuration", () => {
    const rendered = renderAdminIndex(indexHtml, {
      ADMIN_SSO_TOKEN_KEY: "</script><script>alert(1)</script>",
    });

    expect(rendered).not.toContain("</script><script>alert(1)</script>");
    expect(rendered).toContain("\\u003c/script>");
  });
});
