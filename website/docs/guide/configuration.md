# Environment Variables

Variables for the `foxnox` container.

## Required

| Variable | Description |
|---|---|
| `DB_HOST` | Hostname of the PostgreSQL container |
| `DB_NAME` | Database name (default: `foxnox`) |
| `DB_USER` | Database user for Foxnox |
| `DB_PWD` | Database password for Foxnox |
| `PWD_SECRET` | Secret used by `@dwtechs/hashitaka`: salted PBKDF2 for password hashes and security-question answers, HMAC for workflow tokens and trusted-device cookies. Production startup requires at least 32 characters. `FOXNOX_PWD_SECRET` is accepted as an alias. **Rotating it invalidates every stored password hash, every outstanding token, and every remembered device**, so treat it as permanent for the life of the database. |
| `USER_SEARCH_URL` | Search endpoint of your external user-management service. Email-driven workflows call it to resolve an email address to a `userId`. Foxnox validates it at startup when `NODE_ENV=production`; production Compose also rejects an unset value. |

## Optional

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port Foxnox listens on |
| `APP_NAME` | — | Compose stack naming input. Foxnox application code does not use it to build service URLs. |
| `ENV_NAME` | — | Compose environment/network naming input, e.g. `local`, `staging`, `prod`. |
| `SERVICE_NAME` | — | Service identity consumed by the logging/runtime infrastructure; Foxnox does not validate it at startup. |
| `SERVER_SCHEME` | `http://` | Scheme used when falling back to build public URLs |
| `SERVER_URL` | `localhost` | Host used when falling back to build public URLs |
| `TZ` | — | Container timezone |
| `COOKIE_SECURE` | — | Set to `1` to add the `Secure` flag to workflow cookies. Enable it whenever the site is served over HTTPS. |

## Public URLs

These decide what the user actually sees in their browser and in their inbox. Because Foxnox sits behind a BFF, it cannot infer them from the incoming request — get them wrong and reset links will point somewhere unreachable.

| Variable | Default | Description |
|---|---|---|
| `WEB_PUBLIC_ORIGIN` | `{SERVER_SCHEME}{SERVER_URL}:{TRAEFIK_PORT\|8100}` | Absolute origin used to build email deep links, with no path — e.g. `https://app.example.com` |
| `WEB_PUBLIC_BASE` | `/api/foxnox/web` | Browser path prefix for the workflow pages. This is the edge proxy's `/api` prefix plus Foxnox's own `/foxnox/web` mount. |
| `WEB_LOGIN_RESUME_URL` | `{origin}/foxnox/login` | Page that redeems a mid-login resume ticket. After the last login challenge, Foxnox redirects the browser here with `?ticket=…`. |

A deep link is simply `WEB_PUBLIC_ORIGIN` + `WEB_PUBLIC_BASE` + the page path + the token query parameter. For example, with the defaults above, a password reset email links to `http://localhost:8100/api/foxnox/web/recover/reset?token=…`.

## Outbound Mail

Password reset, account recovery, and account unlock emails go out over SMTP.

| Variable | Default | Description |
|---|---|---|
| `SMTP_HOST` | — | SMTP server hostname. **When unset, no mail is sent** — the payload is only logged, which is useful in tests but means users never receive their links. |
| `SMTP_PORT` | `1025` | SMTP port. `1025` matches Mailpit in a local stack; production SMTPS is usually `587` or `465`. |
| `SMTP_SECURE` | unset (`false`) | Set to `true` or `1` to use TLS. Any other value leaves TLS off. |
| `SMTP_FROM` | `{WEB_BRAND_NAME} <noreply@localhost>` | From header, e.g. `"My Project <noreply@example.com>"` |
| `SMTP_USER` | — | SMTP username, if authentication is required |
| `SMTP_PASS` | — | SMTP password, if authentication is required |

## Workflow Page Branding

One brand per Foxnox deployment. See [Branding](./branding) for what each value affects on the page.

| Variable | Default | Description |
|---|---|---|
| `WEB_BRAND_NAME` | `Foxnox` | Product or company name shown in the page header |
| `WEB_BRAND_TAGLINE` | `Account security` | Short line under the name |
| `WEB_BRAND_MARK` | first letter of `WEB_BRAND_NAME` (fallback `F`) | Letter mark shown when no logo URL is set |
| `WEB_BRAND_LOGO_URL` | — | Absolute or root-relative logo URL |
| `WEB_BRAND_LOGO_ALT` | — | Logo alt text |
| `WEB_BRAND_PRIMARY_COLOR` | `#1f6feb` | Main accent colour |
| `WEB_BRAND_PRIMARY_HOVER_COLOR` | `#1858c3` | Button hover accent |
| `WEB_BRAND_SECONDARY_COLOR` | `#5c6570` | Muted and secondary text |
| `WEB_BRAND_BACKGROUND_COLOR` | `#f4f6f8` | Page background |
| `WEB_BRAND_FOOTER_TEXT` | — | Optional footer copy |
| `WEB_BRAND_FOOTER_URL` | — | Optional footer link |

Colour values are sanitized to `#RGB` / `#RRGGBB` before being applied as CSS variables, so an invalid value falls back to the default rather than injecting anything into the page.

## Database migration service

These apply to the `foxnox-migration` container (for example,
`ghcr.io/alten-group/foxnox-migration:0.1.0-alpha.1`):

| Variable | Required | Description |
|---|---|---|
| `LIQUIBASE_COMMAND_USERNAME` | ✅ | PostgreSQL superuser used by Liquibase |
| `LIQUIBASE_COMMAND_PASSWORD` | ✅ | Password for the Liquibase superuser |
| `DB_HOST` | ✅ | Hostname of the PostgreSQL container |
| `DB_PORT` | ⬜ | Port of the PostgreSQL container (default: `5432`) |
| `DB_NAME` | ✅ | Database name to create and migrate |
| `DB_USER` | ✅ | Application database user to create |
| `DB_PWD` | ✅ | Password for the application database user |
| `UPDATE` | ✅ | Set to `1` to run the full migration |
| `ROLLBACK` | ⬜ | Number of changesets to roll back (used instead of `UPDATE`) |
| `SNAPSHOT` | ⬜ | Path to the reference snapshot file |
| `LIQUIBASE_LOG_LEVEL` | ⬜ | Liquibase log verbosity, e.g. `INFO`, `DEBUG` |
| `TZ` | ⬜ | Timezone |

## BFF Variables (Gatelin example)

These are set on the **BFF**, not on Foxnox. The names below are [Gatelin](https://gatelin.fr)'s; a custom BFF needs the same wiring under its own configuration. See [Integration](./integration).

| Variable | Description |
|---|---|
| `PWD_CHECK_URL` | Must point at `http://<foxnox-host>:<port>/foxnox/compare`. |
| `PWD_CHALLENGES_URL` | `http://<foxnox-host>:<port>/foxnox/challenges` — Gatelin configures each integration endpoint separately rather than deriving it from the compare URL. |
| `PWD_TRUSTED_DEVICES_URL` | `http://<foxnox-host>:<port>/foxnox/devices/verify` |
| `PWD_LOGIN_TICKET_URL` | `http://<foxnox-host>:<port>/foxnox/login-tickets/redeem` |
| `USER_SEARCH_URL` | The BFF's own user lookup for login; normally the same URL Foxnox uses. |
| `ADMIN_PASSWORD_RECOVERY_URL` | Set to `/api/foxnox/web/recover` so Gatelin's admin login page shows a "Forgotten password?" link pointing at the Foxnox workflow. |

## Admin UI

| Variable | Default | Description |
|---|---|---|
| `ADMIN_PORT` | — | Dedicated internal port used by the bundled admin server. Unset disables that server. When set it must be an integer between 1024 and 65535, checked at startup in production. Compose commonly supplies `8080`. |
| `ADMIN_BASE_PATH` | `/foxnox` | Public path routed by Traefik to the bundled admin server. |
| `ADMIN_SSO_TOKEN_KEY` | `sso_access_token` | localStorage key the admin UI stores the access token under. Injected at runtime (dev entrypoint + production `src/admin-server.js`), no rebuild required. Not app-prefixed by default because Foxnox and Gatelin admin share the same slot for cookie-based silent refresh when switching between the two apps — if you override it, set the same value on both. |

## Optional build mirrors

Development Dockerfiles use public Alpine and npm registries when no BuildKit
secret is supplied. Private infrastructure may provide:

| Secret | Purpose |
|---|---|
| `apk_repository` | Replacement `/etc/apk/repositories` content |
| `npmrc` | npm registry configuration mounted at `/home/user/.npmrc` |

These are build inputs, not runtime Foxnox variables. Keep credentials outside
the repository; contributors using public registries do not need either secret.

## Maintenance Jobs

Foxnox starts two daily UTC cron jobs with the process:

| Job | Schedule | Retention |
|---|---|---|
| Delete archived entities | 02:00 UTC | Rows archived for more than **2 months**, across passwords, tokens, policies, and trusted devices |
| Delete old history | 03:00 UTC | Rows in `log.history` older than **6 months** |

Note that these purge *archived* rows only. Expired tokens are not deleted by the job — they simply stop validating, because every lookup filters on `expiresAt`.
