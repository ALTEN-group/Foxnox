import { EntityRouteMapping } from "@core/acl/acls.model";

/**
 * Maps each admin CRUD operation to its Gatelin route id.
 *
 * IDs assume Gatelin 0.1.0-alpha.5 core seed (80 routes, last = getBasicUserInfo).
 * Foxnox routes are inserted next by db/liquibase/gatelin-data/03-route.sql —
 * keep these comments in sync when adding/reordering that seed.
 *
 * Route IDs (Foxnox block):
 *   81=comparePwd       82=searchPwds       83=getPwdHistory
 *   84=addPwds          85=updatePwds       86=archivePwds      87=getPwdSchema
 *   88=searchTokens     89=getTokenHistory  90=addTokens
 *   91=updateTokens     92=archiveTokens    93=getTokenSchema
 *   94=searchPolicies   95=getPolicyHistory 96=addPolicies
 *   97=updatePolicies   98=archivePolicies  99=getPolicySchema
 *   100=searchDevices   101=getDeviceHistory 102=addDevices
 *   103=updateDevices   104=archiveDevices  105=getDeviceSchema
 */
export const ENTITY_ROUTE_MAPPING: EntityRouteMapping = {
  passwords: {
    get: 82, // searchPwds
    getHistory: 83, // getPwdHistory
    create: 84, // addPwds
    update: 85, // updatePwds
    archive: 86, // archivePwds
  },
  tokens: {
    get: 88, // searchTokens
    getHistory: 89, // getTokenHistory
    create: 90, // addTokens
    update: 91, // updateTokens
    archive: 92, // archiveTokens
  },
  policies: {
    get: 94, // searchPolicies
    getHistory: 95, // getPolicyHistory
    create: 96, // addPolicies
    update: 97, // updatePolicies
    archive: 98, // archivePolicies
  },
  trustedDevices: {
    get: 100, // searchDevices
    getHistory: 101, // getDeviceHistory
    create: 102, // addDevices
    update: 103, // updateDevices
    archive: 104, // archiveDevices
  },
};
