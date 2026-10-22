--
-- Foxnox web workflow routes (Handlebars SSR): recovery, 2FA, security
-- questions, trusted devices, expired password, unlock, "request sent" pages.
-- Assigned IDs after the CRUD block in 03-route.sql (Gatelin alpha.5 core = 80,
-- Foxnox CRUD = 81-105) → this block starts at 106 on a fresh DB.
--
--   106=getRecoverRequest           107=postRecoverRequest
--   108=getRecoverReset             109=postRecoverReset
--   110=getTwofaVerify              111=postTwofaVerify
--   112=getTwofaSetup               113=postTwofaSetup
--   114=getWebAssets
--   115=getAccountRecoverRequest    116=postAccountRecoverRequest
--   117=getAccountRecoverChallenge  118=postAccountRecoverChallenge
--   119=getSecurityQuestionsSetup   120=postSecurityQuestionsSetup
--   121=getTrustedDevicePrompt      122=postTrustedDevicePrompt
--   123=getTrustedDevicesManage     124=postTrustedDevicesManage
--   125=getPasswordExpired          126=postPasswordExpired
--   127=getUnlockRequest            128=postUnlockRequest
--   129=getUnlockConfirm
--   130=getRecoverSent              131=getAccountRecoverSent
--   132=getUnlockSent
--
-- operationIds: 1=read 2=list 6=create 13=execute
-- methodIds:    1=GET  2=POST
-- Most of these are unprotected (magic-link / pre-auth flows).
-- The "sent" pages are the Post/Redirect/Get targets of the request forms, so a
-- browser refresh never resubmits the form.
--

INSERT INTO routes ("resourceId", pattern, name, description, protected, core, "operationId", "methodIds", "creatorId", "creatorName") VALUES
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/recover',                   'getRecoverRequest',          'Password recovery request form',           false, false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/recover',                   'postRecoverRequest',         'Submit password recovery request',        false, false, ARRAY[6],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/recover/reset',             'getRecoverReset',            'Password reset form (token in query)',   false, false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/recover/reset',             'postRecoverReset',           'Submit new password',                    false, false, ARRAY[6],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/2fa/verify',                'getTwofaVerify',             '2FA verification form',                  false, false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/2fa/verify',                'postTwofaVerify',            'Submit 2FA verification code',           false, false, ARRAY[6],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/2fa/setup',                 'getTwofaSetup',              '2FA setup form',                         true,  false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/2fa/setup',                 'postTwofaSetup',             'Confirm 2FA setup code',                 true,  false, ARRAY[6],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/assets/(?<path>.+)',        'getWebAssets',               'Workflow static assets (css/js)',         false, false, ARRAY[2],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/account-recover',           'getAccountRecoverRequest',   'Account recovery request (lost 2FA)',     false, false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/account-recover',           'postAccountRecoverRequest',  'Submit account recovery request',        false, false, ARRAY[6],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/account-recover/challenge', 'getAccountRecoverChallenge', 'Security-question recovery challenge',   false, false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/account-recover/challenge', 'postAccountRecoverChallenge','Submit security-question answers',      false, false, ARRAY[6],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/security-questions',        'getSecurityQuestionsSetup',  'Enroll security questions',              true,  false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/security-questions',        'postSecurityQuestionsSetup', 'Save security question answers',         true,  false, ARRAY[6],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/trusted-devices/prompt',    'getTrustedDevicePrompt',     'Remember-this-device prompt',            false, false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/trusted-devices/prompt',    'postTrustedDevicePrompt',    'Accept or skip device trust',            false, false, ARRAY[6],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/trusted-devices',           'getTrustedDevicesManage',    'List trusted devices',                   true,  false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/trusted-devices',           'postTrustedDevicesManage',   'Revoke a trusted device',                true,  false, ARRAY[6],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/password/expired',          'getPasswordExpired',         'Forced password change form',            false, false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/password/expired',          'postPasswordExpired',        'Submit expired-password change',         false, false, ARRAY[6],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/unlock',                    'getUnlockRequest',           'Account unlock request form',            false, false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/unlock',                    'postUnlockRequest',          'Submit account unlock request',          false, false, ARRAY[6],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/unlock/confirm',            'getUnlockConfirm',           'Confirm account unlock from link',       false, false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/recover/sent',              'getRecoverSent',             'Password recovery request sent',         false, false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/account-recover/sent',      'getAccountRecoverSent',      'Account recovery request sent',          false, false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/unlock/sent',               'getUnlockSent',              'Account unlock request sent',            false, false, ARRAY[1],  ARRAY[1], -1, 'system')
;
