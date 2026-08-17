--
-- Public account-workflow routes (Handlebars SSR).
-- Assigned IDs after the CRUD block in 03-route.sql (Gatelin alpha.5 core = 80,
-- Foxnox CRUD = 81-105) → this block starts at 106 on a fresh DB.
--
--   106=getRecoverRequest   107=postRecoverRequest
--   108=getRecoverReset     109=postRecoverReset
--   110=getTwofaVerify      111=postTwofaVerify
--   112=getTwofaSetup       113=postTwofaSetup
--   114=getWebAssets
--
-- operationIds: 1=read 2=list 6=create 13=execute
-- methodIds:    1=GET  2=POST
-- Most of these are unprotected (magic-link / pre-auth flows).
--

INSERT INTO routes ("resourceId", pattern, name, description, protected, core, "operationId", "methodIds", "creatorId", "creatorName") VALUES
  ((SELECT id FROM resource WHERE name = 'pwd/web'), '/recover',              'getRecoverRequest',  'Password recovery request form',           false, false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/web'), '/recover',              'postRecoverRequest', 'Submit password recovery request',        false, false, ARRAY[6],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/web'), '/recover/reset',        'getRecoverReset',    'Password reset form (token in query)',   false, false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/web'), '/recover/reset',        'postRecoverReset',   'Submit new password',                    false, false, ARRAY[6],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/web'), '/2fa/verify',           'getTwofaVerify',     '2FA verification form',                  false, false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/web'), '/2fa/verify',           'postTwofaVerify',    'Submit 2FA verification code',           false, false, ARRAY[6],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/web'), '/2fa/setup',            'getTwofaSetup',      '2FA setup form',                         true,  false, ARRAY[1],  ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/web'), '/2fa/setup',            'postTwofaSetup',     'Confirm 2FA setup code',                 true,  false, ARRAY[6],  ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'pwd/web'), '/assets/(?<path>.+)',   'getWebAssets',       'Workflow static assets (css/js)',         false, false, ARRAY[2],  ARRAY[1], -1, 'system')
;
