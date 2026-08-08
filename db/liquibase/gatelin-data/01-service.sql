--
-- Foxnox service. Empty pattern because password.js is mounted at Foxnox's Express root (see 02/03).
--

INSERT INTO service (name, pattern, core, "creatorId", "creatorName") VALUES
  ('foxnox', '', false, -1, 'system')
ON CONFLICT DO NOTHING;
