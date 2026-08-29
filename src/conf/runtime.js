// @ts-check

const MIN_PWD_SECRET_LENGTH = 32;

/**
 * Validate security-sensitive production configuration before startup work.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {void}
 */
export function validateRuntimeEnv(env = process.env) {
  if (env.NODE_ENV !== "production") return;

  const pwdSecret =
    env.PWD_SECRET?.trim() || env.FOXNOX_PWD_SECRET?.trim() || "";
  if (pwdSecret.length < MIN_PWD_SECRET_LENGTH) {
    throw new Error(
      `PWD_SECRET (or FOXNOX_PWD_SECRET) must be at least ${MIN_PWD_SECRET_LENGTH} characters in production`,
    );
  }

  const userSearchUrl = env.USER_SEARCH_URL?.trim() ?? "";
  if (!userSearchUrl) {
    throw new Error("USER_SEARCH_URL is required in production");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(userSearchUrl);
  } catch {
    throw new Error("USER_SEARCH_URL must be a valid absolute URL");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("USER_SEARCH_URL must use http or https");
  }

  // Unset leaves the bundled admin server off (see startAdminServer), so only a
  // supplied value has to be a usable port.
  const rawAdminPort = env.ADMIN_PORT?.trim() ?? "";
  if (rawAdminPort) {
    const adminPort = Number(rawAdminPort);
    if (!Number.isInteger(adminPort) || adminPort < 1024 || adminPort > 65535) {
      throw new Error("ADMIN_PORT must be an integer between 1024 and 65535");
    }
  }

  const adminBasePath = env.ADMIN_BASE_PATH?.trim() || "/foxnox";
  if (
    !/^\/[A-Za-z0-9._~/-]*$/.test(adminBasePath) ||
    adminBasePath.includes("//")
  ) {
    throw new Error("ADMIN_BASE_PATH must be a valid absolute URL path");
  }
}
