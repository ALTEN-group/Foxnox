--
-- Preference resources are separate from Foxnox's routed resources.
-- Their names match the admin entity IDs used in
-- /gatelin/preferences/:resource requests.
--

INSERT INTO resources ("serviceId", name, core, "creatorId", "creatorName") VALUES
  ((SELECT id FROM service WHERE name = 'foxnox'), 'passwords',      false, -1, 'system'),
  ((SELECT id FROM service WHERE name = 'foxnox'), 'policies',       false, -1, 'system'),
  ((SELECT id FROM service WHERE name = 'foxnox'), 'tokens',         false, -1, 'system'),
  ((SELECT id FROM service WHERE name = 'foxnox'), 'trustedDevices', false, -1, 'system')
ON CONFLICT DO NOTHING;
