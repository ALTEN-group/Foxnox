--
-- Browser Origins allowed to call Gatelin.
--
-- Gatelin's CORS whitelist is DB-backed and empty by default, so without a row
-- here every browser request carrying an `Origin` header is rejected with
-- "403 CORS policy violation" — including the admin login.
--
-- The admin UI is served through Traefik, so the Origin is the published
-- host:port (http://localhost:8100 from the host, or the `traefik` hostname
-- from the admin-e2e container) — not the admin container hostname.
-- `credentials = true` is required: the admin sends `credentials: 'include'`
-- so the refresh-token and CSRF cookies ride along.
--
-- Add your production Origin here (or via the admin UI → CORS) when deploying.

INSERT INTO cors (name, description, credentials, "creatorId", "creatorName")
SELECT 'http://localhost:8100', 'Traefik-published admin UI Origin (local dev)', true, -1, 'system'
WHERE NOT EXISTS (SELECT 1 FROM cors WHERE name = 'http://localhost:8100');

INSERT INTO cors (name, description, credentials, "creatorId", "creatorName")
SELECT 'http://traefik', 'Traefik hostname Origin for in-compose Playwright e2e', true, -1, 'system'
WHERE NOT EXISTS (SELECT 1 FROM cors WHERE name = 'http://traefik');
