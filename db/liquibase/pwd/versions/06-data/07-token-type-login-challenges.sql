--
-- Short-lived login challenges (mid-login steps, not email magic links).
-- Issued by POST /pwd/challenges after password OK; consumed by SSR pages.
--

INSERT INTO token_type (name, description, ttl, "maxAttempts")
SELECT '2FA challenge', 'Pending login step: verify TOTP before session is issued', 10, 5
WHERE NOT EXISTS (
  SELECT 1 FROM token_type WHERE name = '2FA challenge'
);

INSERT INTO token_type (name, description, ttl, "maxAttempts")
SELECT 'Expired password challenge', 'Pending login step: force password change after pwdExpiry', 15, 3
WHERE NOT EXISTS (
  SELECT 1 FROM token_type WHERE name = 'Expired password challenge'
);

INSERT INTO token_type (name, description, ttl, "maxAttempts")
SELECT 'Trusted device challenge', 'Pending login step: optional remember-this-device consent', 10, 3
WHERE NOT EXISTS (
  SELECT 1 FROM token_type WHERE name = 'Trusted device challenge'
);

INSERT INTO token_type (name, description, ttl, "maxAttempts")
SELECT 'Login resume', 'One-shot ticket to finish Gatelin session after mid-login challenges', 10, 1
WHERE NOT EXISTS (
  SELECT 1 FROM token_type WHERE name = 'Login resume'
);
