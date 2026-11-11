import { EntityRouteMapping } from "@core/acl/acls.model";

/**
 * Maps each admin CRUD operation to its Gatelin route id.
 *
 * IDs assume Gatelin core seed (90 routes, last = resumeSignIn).
 * Foxnox routes are inserted next by db/liquibase/gatelin-data/03-route.sql —
 * keep these comments in sync when adding/reordering that seed.
 *
 * Route IDs (Foxnox block):
 *   91=comparePwd       92=searchPwds       93=getPwdHistory
 *   94=addPwds          95=updatePwds       96=archivePwds      97=getPwdSchema
 *   98=searchTokens     99=getTokenHistory  100=archiveTokens   101=getTokenSchema
 *   102=searchPolicies  103=getPolicyHistory 104=addPolicies
 *   105=updatePolicies  106=archivePolicies 107=restorePolicies 108=getPolicySchema
 *   109=searchDevices   110=getDeviceHistory 111=getDeviceSchema
 *   112=searchBranding  113=getBrandingHistory 114=updateBranding 115=getBrandingSchema
 *   116-119=preferences 120=searchAudit
 *   121=updateBrandingLogo 122=deleteBrandingLogo
 *   123=updateBrandingFavicon 124=deleteBrandingFavicon 125=previewBranding
 *   126=searchQuestions 127=getQuestionHistory 128=addQuestions
 *   129=updateQuestions 130=archiveQuestions 131=restoreQuestions 132=getQuestionSchema
 */
export const ENTITY_ROUTE_MAPPING: EntityRouteMapping = {
  passwords: {
    get: 92, // searchPwds
    getHistory: 93, // getPwdHistory
    // create/archive intentionally omitted: passwords are provisioned and archived by the user service, never from the admin UI
    update: 95, // updatePwds
  },
  tokens: {
    get: 98, // searchTokens
    getHistory: 99, // getTokenHistory
    // create/update intentionally omitted: tokens are issued and consumed by Foxnox's own flows, never edited from the admin UI
    archive: 100, // archiveTokens
  },
  policies: {
    get: 102, // searchPolicies
    getHistory: 103, // getPolicyHistory
    create: 104, // addPolicies
    update: 105, // updatePolicies
    archive: 106, // archivePolicies
    restore: 107, // restorePolicies
  },
  trustedDevices: {
    get: 109, // searchDevices
    getHistory: 110, // getDeviceHistory
    // create/update/archive intentionally omitted: trusted devices are managed by Foxnox's login/user flows, read-only in the admin UI
  },
  branding: {
    get: 112, // searchBranding
    getHistory: 113, // getBrandingHistory
    update: 114, // updateBranding
    updateFiles: 121, // updateBrandingLogo
  },
  securityQuestions: {
    get: 126, // searchQuestions
    getHistory: 127, // getQuestionHistory
    create: 128, // addQuestions
    update: 129, // updateQuestions
    archive: 130, // archiveQuestions
    restore: 131, // restoreQuestions
  },
  auditLogs: {
    get: 120, // searchAudit (db/liquibase/gatelin-data/03-route.sql)
  },
};
