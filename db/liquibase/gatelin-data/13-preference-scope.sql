--
-- Make Foxnox table preference resources available to scoped ACL roles.
--

INSERT INTO scopes ("routeId", name, core, archived, "creatorId", "creatorName") VALUES
  (
    (
      SELECT r.id
      FROM route r
      JOIN resource res ON res.id = r."resourceId"
      WHERE r.name = 'getPreferences' AND res.name = 'preferences'
    ),
    'passwords', true, false, -1, 'system'
  ),
  (
    (
      SELECT r.id
      FROM route r
      JOIN resource res ON res.id = r."resourceId"
      WHERE r.name = 'getPreferences' AND res.name = 'preferences'
    ),
    'policies', true, false, -1, 'system'
  ),
  (
    (
      SELECT r.id
      FROM route r
      JOIN resource res ON res.id = r."resourceId"
      WHERE r.name = 'getPreferences' AND res.name = 'preferences'
    ),
    'tokens', true, false, -1, 'system'
  ),
  (
    (
      SELECT r.id
      FROM route r
      JOIN resource res ON res.id = r."resourceId"
      WHERE r.name = 'getPreferences' AND res.name = 'preferences'
    ),
    'trustedDevices', true, false, -1, 'system'
  )
ON CONFLICT DO NOTHING;
