# Troubleshooting

## Container Won't Start

```bash
docker compose logs foxnox
```

Foxnox connects to Postgres at boot, so the usual causes are a wrong `DB_HOST` / `DB_PWD`, or the migration container not having finished. Check that `foxnox_migration` exited successfully before the service tried to start.

## Database Connection Issues

```bash
# Check if PostgreSQL is running
docker exec my-project-postgres-local pg_isready -U root -d foxnox

# Test connection from the Foxnox container
docker exec my-project-foxnox-local nc -zv my-project-postgres-local 5432

# Readiness endpoint proves the app itself can query
docker exec my-project-foxnox-local wget -qO- http://localhost:3000/pwd/health/ready
```

If `/pwd/health` answers but `/pwd/health/ready` fails, the process is alive but has lost the database — the readiness probe is doing its job and taking the instance out of rotation.

## Migration Failures

```bash
# View migration logs
docker logs my-project-foxnox-migration-local

# Rollback the last changeset
docker compose run --rm -e UPDATE=0 -e ROLLBACK=1 foxnox_migration
```

## Every Password Check Suddenly Fails

The most likely cause is that `PWD_SECRET` changed. It is the HMAC key for both password hashes and token hashes, so a new value means no stored hash can ever match again, and every outstanding reset link becomes invalid.

There is no migration path for this — restore the old secret if you still have it. If you do not, every user needs a password reset.

## Login Returns 202 Forever

**202** is not an error. It means the password was accepted but a mid-login challenge is required. If sign-in never completes, check in order:

1. The frontend actually redirects the browser to the `url` from the 202 body, instead of treating 202 as a failure. This is by far the most common cause — see [Frontend Integration](./frontend).
2. That URL is reachable. It is built from `WEB_PUBLIC_ORIGIN` + `WEB_PUBLIC_BASE`, so a wrong value here produces a link that 404s.
3. The `pwd/web` routes are registered in Gatelin database (`db/liquibase/gatelin-data/`, changesets 05–08).
4. After the last challenge page, the browser lands on `WEB_LOGIN_RESUME_URL` with `?ticket=…` and your code calls `POST /gatelin/sessions/resume`.
5. Tickets are one-shot and last 10 minutes. Reloading the resume URL a second time correctly fails with **400**.

## Login Never Asks for 2FA

Challenges are minted from the `pwd` row, so check the row rather than the code:

```sql
SELECT id, "userId", "twoFactorEnabled", "pwdExpiry", "lockedUntil"
FROM pwd WHERE "userId" = 1;
```

If `twoFactorEnabled` is false, no 2FA challenge will ever be raised — the user has to enroll first at `/api/pwd/web/2fa/setup`. If it is true and 2FA is still skipped, the browser probably holds a valid `trusted_device` cookie; clear it, or revoke the device at `/api/pwd/web/trusted-devices`.

## Account Locked (403)

The user's `lockedUntil` is still in the future after too many failed attempts. They can clear it themselves through `/api/pwd/web/unlock`, which emails an unlock link. To clear it immediately as an administrator, update the row:

```
PUT /api/pwd/
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    { "id": 1, "failedAttempts": 0, "lockedUntil": null }
  ]
}
```

## Reset or Unlock Emails Never Arrive

First check whether Foxnox even tried. When `SMTP_HOST` is unset, `notifyUser` logs the payload instead of sending — deliberately, so tests do not need a mail server, but it means production silence if the variable is missing.

```bash
docker compose logs foxnox | grep -i notify
```

In a local stack, mail is caught by Mailpit rather than delivered; open its UI at `http://localhost:8025` and read the message there.

Note that the request form always shows the same confirmation page whether or not the address exists. That is intentional — it prevents attackers from discovering which email addresses have accounts — but it also means a typo looks identical to success.

## Reset Link Says "Invalid or Expired"

Tokens are single-use and short-lived. Each type has its own limits:

| Token type | Time to live | Max attempts |
|---|---|---|
| Password reset | 30 min | 3 |
| Account recovery | 60 min | 3 |
| Account unlock | 30 min | 3 |
| 2FA challenge | 10 min | 5 |
| Expired password challenge | 15 min | 3 |
| Trusted device challenge | 10 min | 3 |
| Login resume | 10 min | 1 |

Also check that the link was not already used, and that the user opened the most recent email — requesting a new link does not stop an old one from expiring on its own schedule.

## Workflow Pages Look Unstyled

The pages load their CSS from `/pwd/web/assets/…`. If that route is missing from Gatelin database (`getWebAssets` in changeset 06), the HTML renders but every asset request 404s. Confirm with:

```bash
curl -i http://localhost:8100/api/pwd/web/assets/css/main.css
```

## CSRF Errors on Workflow Forms

Every workflow `POST` uses a signed double-submit check: a `foxnox_csrf` cookie plus a matching hidden `csrf` field. Failures usually mean cookies are being dropped between the `GET` that rendered the form and the `POST`. Check that the form is served from the same origin the browser posts back to, and if you are on HTTPS, that `COOKIE_SECURE=1` is set.
