-- Dev / e2e user-service (Megadex) registration for the local Docker stack.
-- Placed after Foxnox's own routes so Foxnox route IDs stay stable.

INSERT INTO service (name, pattern, "forwardedCookies", core, "creatorId", "creatorName") VALUES
  ('megadex', '', '{}', false, -1, 'system')
ON CONFLICT DO NOTHING;

INSERT INTO resources ("serviceId", name, core, "creatorId", "creatorName") VALUES
  ((SELECT id FROM service WHERE name = 'megadex'), 'megadex/users', false, -1, 'system')
ON CONFLICT DO NOTHING;

INSERT INTO routes ("resourceId", pattern, name, description, protected, core, "operationId", "methodIds", "creatorId", "creatorName")
SELECT
  (SELECT id FROM resource WHERE name = 'megadex/users'),
  '/me',
  'getBasicUserInfo',
  'Get authenticated user basic info for the admin',
  true,
  false,
  ARRAY[1],
  ARRAY[1],
  -1,
  'system'
WHERE NOT EXISTS (
  SELECT 1 FROM route WHERE name = 'getBasicUserInfo'
);

INSERT INTO permissions ("roleId", "routeId", "operationId", fields, "conditionId", "creatorId", "creatorName")
SELECT
  rl.id,
  r.id,
  ro."operationId",
  NULL,
  NULL,
  -1,
  'system'
FROM route r
JOIN route_operation ro ON ro."routeId" = r.id
JOIN role rl ON rl.archived = false
WHERE r.name = 'getBasicUserInfo'
  AND NOT EXISTS (
    SELECT 1
    FROM permission p
    WHERE p."roleId" = rl.id
      AND p."routeId" = r.id
      AND p."operationId" = ro."operationId"
  );
