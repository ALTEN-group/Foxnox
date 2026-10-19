/**
 * Runtime admin config injected into index.html by the Docker entrypoint (dev)
 * or by src/admin-server.js (prod). Lets ops set ADMIN_SSO_TOKEN_KEY and
 * ADMIN_ROLES_SEARCH_URL without rebuilding Angular.
 */
export interface FoxnoxAdminRuntime {
  ssoTokenKey?: string;
  /** Gatelin "search roles" route, used to pick the roles of a password policy. */
  rolesSearchUrl?: string;
}

declare global {
  interface Window {
    __FOXNOX_ADMIN__?: FoxnoxAdminRuntime;
  }
}

export function readAdminRuntimeConfig(): FoxnoxAdminRuntime {
  if (typeof window === "undefined") return {};
  const raw = window.__FOXNOX_ADMIN__;
  return raw && typeof raw === "object" ? raw : {};
}
