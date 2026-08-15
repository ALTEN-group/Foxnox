import { EntityRouteMapping } from "@core/acl/acls.model";

/**
 * Base entity-routes mapping, defining mapping between routes and their id in the database.
 *
 * NOTE: Foxnox entity HTTP paths are `/pwd/…` (see ENTITY_API_PATHS). Route-id ACL
 * gating is disabled for this app (see acl.guard.ts) — every authenticated user has
 * access to every page. These ids are unused placeholders kept only to satisfy
 * AclService's type contract; replace them with real Gatelin route ids when wiring ACLs.
 */
export const ENTITY_ROUTE_MAPPING: EntityRouteMapping = {
  passwords: {
    get: 1,
    getHistory: 2,
    create: 3,
    update: 4,
    archive: 5,
  },
  policies: {
    get: 6,
    getHistory: 7,
    create: 8,
    update: 9,
    archive: 10,
  },
  tokens: {
    get: 11,
    getHistory: 12,
    create: 13,
    update: 14,
    archive: 15,
  },
  trustedDevices: {
    get: 16,
    getHistory: 17,
    create: 18,
    update: 19,
    archive: 20,
  },
};
