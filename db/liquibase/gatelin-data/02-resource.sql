--
-- Foxnox resource default inserts.
-- name='' matches password.js, mounted at Foxnox's Express root with no prefix.
-- The other 3 carry their real /pwd/* mount path in the name itself, since service.pattern is empty.
--

INSERT INTO resources ("serviceId", name, core, "creatorId", "creatorName") VALUES
  ((SELECT id FROM service WHERE name = 'foxnox'), 'pwd',                    false, -1, 'system'),
  ((SELECT id FROM service WHERE name = 'foxnox'), 'pwd/tokens',          false, -1, 'system'),
  ((SELECT id FROM service WHERE name = 'foxnox'), 'pwd/policies',        false, -1, 'system'),
  ((SELECT id FROM service WHERE name = 'foxnox'), 'pwd/trusted-devices', false, -1, 'system')
ON CONFLICT DO NOTHING;
