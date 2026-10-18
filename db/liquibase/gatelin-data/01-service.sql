--
-- Foxnox service. Empty pattern because password.js is mounted at Foxnox's Express root (see 02/03).
-- forwardedCookies: workflow pages use a double-submit CSRF cookie that Gatelin drops unless registered.
--

INSERT INTO service (name, pattern, "forwardedCookies", core, "creatorId", "creatorName") VALUES
  ('foxnox', '', ARRAY['foxnox_csrf'], false, -1, 'system')
ON CONFLICT DO NOTHING;
