import { EntityRouteMapping } from "@core/acl/acls.model";

/**
 * Base entity-routes mapping, defining mapping between routes and their id in the database.
 *
 * NOTE: Gatelin's gateway does not have any route/permission registered for Foxnox's
 * endpoints yet (separate DB task on the Gatelin side), so there are no real ids to put
 * here. ACL route-id gating is disabled for this app (see acl.guard.ts, which no longer
 * calls AclService.hasAccess) — every authenticated user has access to every page. These
 * ids are unused placeholders kept only to satisfy AclService's type contract; update them
 * once Gatelin registers real routes for Foxnox's resources.
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
