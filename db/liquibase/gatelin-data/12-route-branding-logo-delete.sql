--
-- Branding logo delete route (DELETE /foxnox/branding/:id/logo).
-- Appended after 11-route-branding-logo.sql: route ids are positional, so it gets
-- the next id (142 on an 80-route Gatelin core, 143 on alpha.8's 81 routes).
--
--   143=deleteBrandingLogo
--
-- operationIds: 10=delete  methodIds: 5=DELETE
--

INSERT INTO routes ("resourceId", pattern, name, description, protected, core, "operationId", "methodIds", "creatorId", "creatorName") VALUES
  ((SELECT id FROM resource WHERE name = 'foxnox/branding'), '/(?<id>\d+)/logo', 'deleteBrandingLogo', 'Delete branding logo', true, false, ARRAY[10], ARRAY[5], -1, 'system')
;

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
JOIN route_operation ro ON ro."routeId" = r.id
CROSS JOIN (VALUES (1), (2)) AS roles(id)
WHERE r.name = 'deleteBrandingLogo'
  AND NOT EXISTS (
    SELECT 1
    FROM permission p
    WHERE p."roleId" = roles.id
      AND p."routeId" = r.id
      AND p."operationId" = ro."operationId"
  );
