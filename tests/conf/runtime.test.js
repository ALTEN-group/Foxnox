/** @jest-environment node */
// @ts-check

import { validateRuntimeEnv } from "../../src/conf/runtime.js";

const validProductionEnv = {
  NODE_ENV: "production",
  PWD_SECRET: "a".repeat(32),
  USER_SEARCH_URL: "https://users.example.com/users/search",
  ADMIN_PORT: "8080",
  ADMIN_BASE_PATH: "/foxnox",
};

describe("runtime configuration", () => {
  it("should skip production requirements outside production", () => {
    expect(() => validateRuntimeEnv({ NODE_ENV: "development" })).not.toThrow();
  });

  it("should require a sufficiently long production password secret", () => {
    expect(() =>
      validateRuntimeEnv({ ...validProductionEnv, PWD_SECRET: "too-short" }),
    ).toThrow(
      "PWD_SECRET (or FOXNOX_PWD_SECRET) must be at least 32 characters in production",
    );
  });

  it("should require a production user search URL", () => {
    expect(() =>
      validateRuntimeEnv({ ...validProductionEnv, USER_SEARCH_URL: "" }),
    ).toThrow("USER_SEARCH_URL is required in production");
  });

  it("should require an absolute HTTP user search URL", () => {
    expect(() =>
      validateRuntimeEnv({
        ...validProductionEnv,
        USER_SEARCH_URL: "/users/search",
      }),
    ).toThrow("USER_SEARCH_URL must be a valid absolute URL");

    expect(() =>
      validateRuntimeEnv({
        ...validProductionEnv,
        USER_SEARCH_URL: "file:///users/search",
      }),
    ).toThrow("USER_SEARCH_URL must use http or https");
  });

  it("should accept valid production configuration", () => {
    expect(() => validateRuntimeEnv(validProductionEnv)).not.toThrow();
  });

  it("should require the bundled production admin server configuration", () => {
    expect(() =>
      validateRuntimeEnv({ ...validProductionEnv, ADMIN_PORT: "" }),
    ).toThrow("ADMIN_PORT must be an integer between 1024 and 65535");

    expect(() =>
      validateRuntimeEnv({
        ...validProductionEnv,
        ADMIN_BASE_PATH: '/foxnox"><script>',
      }),
    ).toThrow("ADMIN_BASE_PATH must be a valid absolute URL path");
  });

  it("should accept the documented Foxnox password-secret alias", () => {
    const { PWD_SECRET: _pwdSecret, ...env } = validProductionEnv;
    expect(() =>
      validateRuntimeEnv({
        ...env,
        FOXNOX_PWD_SECRET: "a".repeat(32),
      }),
    ).not.toThrow();
  });
});
