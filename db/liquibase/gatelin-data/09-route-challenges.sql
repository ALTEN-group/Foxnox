--
-- Login-challenge mint API (Gatelin calls this after password OK).
--

INSERT INTO resources ("serviceId", name, core, "creatorId", "creatorName")
SELECT id, 'foxnox/challenges', false, -1, 'system'
FROM service
WHERE name = 'foxnox'
  AND NOT EXISTS (
    SELECT 1 FROM resource WHERE name = 'foxnox/challenges'
  );

INSERT INTO routes ("resourceId", pattern, name, description, protected, core, "operationId", "methodIds", "creatorId", "creatorName")
SELECT
  (SELECT id FROM resource WHERE name = 'foxnox/challenges'),
  '',
  'createLoginChallenge',
  'Mint a mid-login challenge (2FA / expired password / trusted device)',
  true,
  false,
  ARRAY[6],
  ARRAY[2],
  -1,
  'system'
WHERE NOT EXISTS (
  SELECT 1 FROM route WHERE name = 'createLoginChallenge'
);

INSERT INTO permissions ("roleId", "routeId", "operationId", fields, "conditionId", "creatorId", "creatorName")
SELECT
  roles.id,
  r.id,
  ro."operationId",
  NULL,
  NULL,
  -1,
  'system'
FROM route r
JOIN resource res ON res.id = r."resourceId"
JOIN service s ON s.id = res."serviceId"
JOIN route_operation ro ON ro."routeId" = r.id
CROSS JOIN (VALUES (1), (2)) AS roles(id)
WHERE s.name = 'foxnox'
  AND r.name = 'createLoginChallenge'
  AND NOT EXISTS (
    SELECT 1
    FROM permission p
    WHERE p."roleId" = roles.id
      AND p."routeId" = r.id
      AND p."operationId" = ro."operationId"
  );
