import { AdminEntity } from "@core/app-config/app.entities";

/**
 * Gatelin `resources.name` values for Foxnox (see db/liquibase/gatelin-data).
 * Public URLs are `/api/<path>/…` and match the upstream Foxnox mount paths
 * (Gatelin forwards the path unchanged).
 *
 * Keep {@link AdminEntity} as the UI/ACL key; use these only for HTTP.
 */
export const ENTITY_API_PATHS: Record<AdminEntity, string> = {
  passwords: "pwd",
  policies: "pwd/policies",
  tokens: "pwd/tokens",
  trustedDevices: "pwd/trusted-devices",
};
