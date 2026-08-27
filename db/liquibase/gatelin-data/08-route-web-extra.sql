--
-- Additional Foxnox web workflow routes (account recovery, security questions,
-- trusted devices, expired password, unlock).
-- Continues after 06-route-web.sql (IDs 106-114 on a fresh alpha.5 DB) → 115+.
--
--   115=getAccountRecoverRequest    116=postAccountRecoverRequest
--   117=getAccountRecoverChallenge  118=postAccountRecoverChallenge
--   119=getSecurityQuestionsSetup   120=postSecurityQuestionsSetup
--   121=getTrustedDevicePrompt      122=postTrustedDevicePrompt
--   123=getTrustedDevicesManage     124=postTrustedDevicesManage
--   125=getPasswordExpired          126=postPasswordExpired
--   127=getUnlockRequest            128=postUnlockRequest
--   129=getUnlockConfirm
--
-- operationIds: 1=read 2=list 6=create
-- methodIds:    1=GET  2=POST
--

INSERT INTO routes ("resourceId", pattern, name, description, protected, core, "operationId", "methodIds", "creatorId", "creatorName") VALUES
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/account-recover',           'getAccountRecoverRequest',   'Account recovery request (lost 2FA)',     false, false, ARRAY[1], ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/account-recover',           'postAccountRecoverRequest',  'Submit account recovery request',        false, false, ARRAY[6], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/account-recover/challenge', 'getAccountRecoverChallenge', 'Security-question recovery challenge',   false, false, ARRAY[1], ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/account-recover/challenge', 'postAccountRecoverChallenge','Submit security-question answers',      false, false, ARRAY[6], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/security-questions',        'getSecurityQuestionsSetup',  'Enroll security questions',              true,  false, ARRAY[1], ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/security-questions',        'postSecurityQuestionsSetup', 'Save security question answers',         true,  false, ARRAY[6], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/trusted-devices/prompt',    'getTrustedDevicePrompt',     'Remember-this-device prompt',           false, false, ARRAY[1], ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/trusted-devices/prompt',    'postTrustedDevicePrompt',    'Accept or skip device trust',            false, false, ARRAY[6], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/trusted-devices',           'getTrustedDevicesManage',    'List trusted devices',                   true,  false, ARRAY[1], ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/trusted-devices',           'postTrustedDevicesManage',   'Revoke a trusted device',                true,  false, ARRAY[6], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/password/expired',          'getPasswordExpired',         'Forced password change form',            false, false, ARRAY[1], ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/password/expired',          'postPasswordExpired',        'Submit expired-password change',         false, false, ARRAY[6], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/unlock',                    'getUnlockRequest',           'Account unlock request form',            false, false, ARRAY[1], ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/unlock',                    'postUnlockRequest',          'Submit account unlock request',          false, false, ARRAY[6], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/unlock/confirm',            'getUnlockConfirm',           'Confirm account unlock from link',       false, false, ARRAY[1], ARRAY[1], -1, 'system')
;
