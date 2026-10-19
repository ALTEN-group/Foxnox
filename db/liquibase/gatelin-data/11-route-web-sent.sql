--
-- "Request sent" confirmation pages. The request forms (POST) redirect here
-- (Post/Redirect/Get) so a browser refresh never resubmits the form.
--
-- operationIds: 1=read
-- methodIds:    1=GET
--

INSERT INTO routes ("resourceId", pattern, name, description, protected, core, "operationId", "methodIds", "creatorId", "creatorName") VALUES
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/recover/sent',         'getRecoverSent',        'Password recovery request sent',  false, false, ARRAY[1], ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/account-recover/sent', 'getAccountRecoverSent', 'Account recovery request sent', false, false, ARRAY[1], ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'foxnox/web'), '/unlock/sent',          'getUnlockSent',         'Account unlock request sent',     false, false, ARRAY[1], ARRAY[1], -1, 'system')
;
