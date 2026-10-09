import { AdminEntity } from "@core/app-config/app.entities";

/**
 * Gatelin `resources.name` values for Foxnox (see db/liquibase/gatelin-data).
 * Paths are relative to the configured `/api/foxnox/` API base (which ends with a slash).
 *
 * Keep {@link AdminEntity} as the UI/ACL key; use these only for HTTP.
 */
export const ENTITY_API_PATHS: Record<AdminEntity, string> = {
  passwords: "pwd",
  policies: "policies",
  tokens: "tokens",
  trustedDevices: "devices",
  branding: "branding",
  auditLogs: "audit",
};
