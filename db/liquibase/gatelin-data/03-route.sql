--
-- Foxnox route default inserts.
-- operationIds: 2=list 5=bulk update 7=bulk create 9=bulk archive 13=execute (from Gatelin's core operation seed)
-- methodIds:    1=GET  2=POST        3=PUT                                    (from Gatelin's core method seed)
--
-- Assigned route IDs (Gatelin 0.1.0-alpha.5 core seed ends at 80 = getBasicUserInfo):
--   81=comparePwd       82=searchPwds       83=getPwdHistory
--   84=addPwds          85=updatePwds       86=archivePwds      87=getPwdSchema
--   88=searchTokens     89=getTokenHistory  90=addTokens
--   91=updateTokens     92=archiveTokens    93=getTokenSchema
--   94=searchPolicies   95=getPolicyHistory 96=addPolicies
--   97=updatePolicies   98=archivePolicies  99=getPolicySchema
--   100=searchDevices   101=getDeviceHistory 102=addDevices
--   103=updateDevices   104=archiveDevices  105=getDeviceSchema
-- Keep admin/src/app/core/app-config/app.acls.ts in sync with this order.
--

INSERT INTO routes ("resourceId", pattern, name, description, protected, core, "operationId", "methodIds", "creatorId", "creatorName") VALUES
  -- password (mounted at Foxnox's Express root, matches password.js exactly)
  ((SELECT id FROM resource WHERE name = 'pwd'),                    '/compare',            'comparePwd',       'Compare a plaintext password against its hash', true, false, ARRAY[13], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd'),                    '/search',             'searchPwds',       'Search passwords',                              true, false, ARRAY[2],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd'),                    '/(?<id>\d+)/history', 'getPwdHistory',    'Manage password history',                       true, false, ARRAY[2],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd'),                    '',                    'addPwds',          'Add passwords',                                 true, false, ARRAY[7],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd'),                    '',                    'updatePwds',       'Update passwords',                              true, false, ARRAY[5],  ARRAY[3], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd'),                    '/archive',            'archivePwds',      'Archive passwords',                             true, false, ARRAY[9],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd'),                    '/schema',             'getPwdSchema',     'Get password entity schema',                    true, false, ARRAY[2],  ARRAY[1], -1, 'system'),

  -- tokens (/pwd/tokens)
  ((SELECT id FROM resource WHERE name = 'pwd/tokens'),          '/search',             'searchTokens',     'Search tokens',                                 true, false, ARRAY[2],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/tokens'),          '/(?<id>\d+)/history', 'getTokenHistory',  'Manage token history',                          true, false, ARRAY[2],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/tokens'),          '',                    'addTokens',        'Add tokens',                                    true, false, ARRAY[7],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/tokens'),          '',                    'updateTokens',     'Update tokens',                                 true, false, ARRAY[5],  ARRAY[3], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/tokens'),          '/archive',            'archiveTokens',    'Archive tokens',                                true, false, ARRAY[9],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/tokens'),          '/schema',             'getTokenSchema',   'Get token entity schema',                       true, false, ARRAY[2],  ARRAY[1], -1, 'system'),

  -- policies (/pwd/policies)
  ((SELECT id FROM resource WHERE name = 'pwd/policies'),        '/search',             'searchPolicies',   'Search password policies',                      true, false, ARRAY[2],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/policies'),        '/(?<id>\d+)/history', 'getPolicyHistory', 'Manage password policy history',                true, false, ARRAY[2],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/policies'),        '',                    'addPolicies',      'Add password policies',                         true, false, ARRAY[7],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/policies'),        '',                    'updatePolicies',   'Update password policies',                      true, false, ARRAY[5],  ARRAY[3], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/policies'),        '/archive',            'archivePolicies',  'Archive password policies',                     true, false, ARRAY[9],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/policies'),        '/schema',             'getPolicySchema',  'Get password policy entity schema',             true, false, ARRAY[2],  ARRAY[1], -1, 'system'),

  -- trusted-devices (/pwd/trusted-devices)
  ((SELECT id FROM resource WHERE name = 'pwd/trusted-devices'), '/search',             'searchDevices',    'Search trusted devices',                        true, false, ARRAY[2],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/trusted-devices'), '/(?<id>\d+)/history', 'getDeviceHistory', 'Manage trusted device history',                 true, false, ARRAY[2],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/trusted-devices'), '',                    'addDevices',       'Add trusted devices',                           true, false, ARRAY[7],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/trusted-devices'), '',                    'updateDevices',    'Update trusted devices',                        true, false, ARRAY[5],  ARRAY[3], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/trusted-devices'), '/archive',            'archiveDevices',   'Archive trusted devices',                       true, false, ARRAY[9],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/trusted-devices'), '/schema',             'getDeviceSchema',  'Get trusted device entity schema',              true, false, ARRAY[2],  ARRAY[1], -1, 'system')
;
