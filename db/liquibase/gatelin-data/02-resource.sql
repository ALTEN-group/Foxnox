--
-- Foxnox resource default inserts.
-- Resource names carry their real /foxnox/* mount paths because service.pattern is empty.
--
-- Gatelin's `resource.name` is varchar(20) and is concatenated literally into the
-- matched URL, so every name here must stay <= 20 characters AND match the Express
-- mount in src/app.js. That is why the device routes are mounted at
-- `/foxnox/devices` rather than `/foxnox/trusted-devices` (22 characters).
--

INSERT INTO resources ("serviceId", name, core, "creatorId", "creatorName") VALUES
  ((SELECT id FROM service WHERE name = 'foxnox'), 'foxnox',          false, -1, 'system'),
  ((SELECT id FROM service WHERE name = 'foxnox'), 'foxnox/tokens',   false, -1, 'system'),
  ((SELECT id FROM service WHERE name = 'foxnox'), 'foxnox/policies', false, -1, 'system'),
  ((SELECT id FROM service WHERE name = 'foxnox'), 'foxnox/devices',  false, -1, 'system')
ON CONFLICT DO NOTHING;
