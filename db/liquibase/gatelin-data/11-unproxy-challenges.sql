--
-- Login-challenge mint is an internal BFF call (PWD_CHALLENGES_URL), like
-- login-ticket redeem. It must not be a Gatelin-proxied admin route: a session
-- holder could otherwise mint a trusted-device or expired-password challenge
-- for any userId and take over the account.
--

DELETE FROM permissions
WHERE "routeId" IN (
  SELECT id FROM route WHERE name = 'createLoginChallenge'
);

DELETE FROM route_operation
WHERE "routeId" IN (
  SELECT id FROM route WHERE name = 'createLoginChallenge'
);

DELETE FROM routes
WHERE name = 'createLoginChallenge';

DELETE FROM resources
WHERE name = 'foxnox/challenges';
