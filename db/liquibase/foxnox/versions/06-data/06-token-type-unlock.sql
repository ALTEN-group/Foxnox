--
-- Account unlock token type for the /foxnox/web/unlock workflow.
--

INSERT INTO token_type (name, description, ttl, "maxAttempts")
SELECT 'Account unlock', 'Token for unlocking a locked account after failed attempts', 30, 3
WHERE NOT EXISTS (
  SELECT 1 FROM token_type WHERE name = 'Account unlock'
);
