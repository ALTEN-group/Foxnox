--
-- Mock token rows for the admin UI (one of each type across mock users).
-- token.hash defaults via gen_random_bytes; expiresAt is derived from token_type.ttl.
--

INSERT INTO token ("typeId", "userId", attempts, "expiresAt", "verifiedAt", archived, "creatorId", "creatorName")
SELECT
  tt.id,
  u.uid,
  0,
  NOW() + (tt.ttl || ' minutes')::interval,
  CASE WHEN tt.name = 'Email verification' THEN NOW() - INTERVAL '1 day' ELSE NULL END,
  FALSE,
  -1,
  'system'
FROM token_type tt
CROSS JOIN (VALUES (1), (2), (3), (4), (5)) AS u(uid)
WHERE tt.archived IS NOT TRUE
  AND NOT EXISTS (
    SELECT 1 FROM token t
    WHERE t."typeId" = tt.id AND t."userId" = u.uid AND t.archived IS NOT TRUE
  );
