/**
 * Runtime admin config injected into index.html by the Docker entrypoint (dev)
 * or by scripts/entrypoint-prod.sh (prod). Lets ops set ADMIN_SSO_TOKEN_KEY
 * without rebuilding Angular.
 */
export interface FoxnoxAdminRuntime {
  ssoTokenKey?: string;
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
