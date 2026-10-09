--
-- Grant Foxnox route access to Super admin (1) and Admin (2).
-- Operations come from each route's declared route_operation rows
-- (see 03-route.sql), so this stays in sync when routes are added.
-- add/update on tokens and trusted devices are never granted: they are issued
-- and consumed by Foxnox's own flows and must not be created or edited from the admin.
--
-- Admin UI ACL mapping lives in admin/src/app/core/app-config/app.acls.ts
-- and keys off the search/history/create/update/archive route IDs from 03-route.sql.
--

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
  AND r.name NOT IN ('addTokens', 'updateTokens', 'addDevices', 'updateDevices')
  AND NOT EXISTS (
    SELECT 1
    FROM permission p
    WHERE p."roleId" = roles.id
      AND p."routeId" = r.id
      AND p."operationId" = ro."operationId"
  );
