--
-- Branding logo upload route (PUT /foxnox/branding/:id/logo, multipart).
-- Appended after 08-route-web-extra.sql: route ids are positional, so it gets
-- the next id (141 on an 80-route Gatelin core, 142 on alpha.8's 81 routes).
--
--   142=updateBrandingLogo
--
-- operationIds: 5=update  methodIds: 3=PUT
--

INSERT INTO routes ("resourceId", pattern, name, description, protected, core, "operationId", "methodIds", "creatorId", "creatorName") VALUES
  ((SELECT id FROM resource WHERE name = 'foxnox/branding'), '/(?<id>\d+)/logo', 'updateBrandingLogo', 'Upload branding logo', true, false, ARRAY[5], ARRAY[3], -1, 'system')
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
WHERE r.name = 'updateBrandingLogo'
  AND NOT EXISTS (
    SELECT 1
    FROM permission p
    WHERE p."roleId" = roles.id
      AND p."routeId" = r.id
      AND p."operationId" = ro."operationId"
  );
