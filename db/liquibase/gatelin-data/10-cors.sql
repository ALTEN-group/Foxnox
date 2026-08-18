--
-- Browser Origins allowed to call the gateway.
--
-- Gatelin's CORS whitelist is DB-backed and empty by default, so without a row
-- here every browser request carrying an `Origin` header is rejected with
-- "403 CORS policy violation" — including the admin login.
--
-- The admin UI is served through Traefik, so the Origin is the published
-- host:port (http://localhost:8100 locally), not the container hostname.
-- `credentials = true` is required: the admin sends `credentials: 'include'`
-- so the refresh-token and CSRF cookies ride along.
--
-- Add your production Origin here (or via the admin UI → CORS) when deploying.

INSERT INTO cors (name, description, credentials, "creatorId", "creatorName")
SELECT 'http://localhost:8100', 'Traefik-published admin UI Origin (local dev)', true, -1, 'system'
WHERE NOT EXISTS (SELECT 1 FROM cors WHERE name = 'http://localhost:8100');
