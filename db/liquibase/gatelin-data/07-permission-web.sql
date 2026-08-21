--
-- Grant protected web workflow routes to Super admin (1) and Admin (2).
-- Unprotected routes (recovery + 2FA verify + assets) need no role grants.
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
  AND res.name = 'pwd/web'
  AND r.protected = true
  AND NOT EXISTS (
    SELECT 1
    FROM permission p
    WHERE p."roleId" = roles.id
      AND p."routeId" = r.id
      AND p."operationId" = ro."operationId"
  );
