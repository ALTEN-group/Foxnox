import { AdminEntity } from "@core/app-config/app.entities";

/**
 * Gatelin `resources.name` values for Foxnox (see db/liquibase/gatelin-data).
 * Paths are relative to the configured `/api/foxnox` API base.
 *
 * Keep {@link AdminEntity} as the UI/ACL key; use these only for HTTP.
 */
export const ENTITY_API_PATHS: Record<AdminEntity, string> = {
  passwords: "",
  policies: "/policies",
  tokens: "/tokens",
  trustedDevices: "/devices",
};
