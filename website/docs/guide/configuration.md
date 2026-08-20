# Environment Variables

Variables for the `foxnox` container.

## Required

| Variable | Description |
|---|---|
| `DB_HOST` | Hostname of the PostgreSQL container |
| `DB_NAME` | Database name (default: `foxnox`) |
| `DB_USER` | Database user for Foxnox |
| `DB_PWD` | Database password for Foxnox |
| `PWD_SECRET` | HMAC secret used for password hashes and token hashes, at least 32 characters. **Rotating it invalidates every stored password hash and every outstanding token**, so treat it as permanent for the life of the database. |
| `USER_SEARCH_URL` | Search endpoint of your user management service. Email-driven workflows call it to resolve an email address to a `userId`. |
| `SERVICE_NAME` | Container hostname of the Foxnox service (used for logs) |

## Optional

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port Foxnox listens on |
| `APP_NAME` | — | Application name, used in logs and to build internal service URLs |
| `ENV_NAME` | — | Environment name, e.g. `local`, `staging`, `prod` |
| `SERVER_SCHEME` | `http://` | Scheme used when falling back to build public URLs |
| `SERVER_URL` | `localhost` | Host used when falling back to build public URLs |
| `TZ` | — | Container timezone |
| `COOKIE_SECURE` | — | Set to `1` to add the `Secure` flag to workflow cookies. Enable it whenever the site is served over HTTPS. |

## Public URLs

These decide what the user actually sees in their browser and in their inbox. Because Foxnox sits behind Gatelin, it cannot infer them from the incoming request — get them wrong and reset links will point somewhere unreachable.

| Variable | Default | Description |
|---|---|---|
| `WEB_PUBLIC_ORIGIN` | `{SERVER_SCHEME}{SERVER_URL}:{TRAEFIK_PORT\|8100}` | Absolute origin used to build email deep links, with no path — e.g. `https://app.example.com` |
| `WEB_PUBLIC_BASE` | `/api/pwd/web` | Browser path prefix for the workflow pages. This is the edge proxy's `/api` prefix plus Foxnox's own `/pwd/web` mount. |
| `WEB_LOGIN_RESUME_URL` | `{origin}/admin/login` | Page that redeems a mid-login resume ticket. After the last login challenge, Foxnox redirects the browser here with `?ticket=…`. |

A deep link is simply `WEB_PUBLIC_ORIGIN` + `WEB_PUBLIC_BASE` + the page path + the token query parameter. For example, with the defaults above, a password reset email links to `http://localhost:8100/api/pwd/web/recover/reset?token=…`.

## Outbound Mail

Password reset, account recovery, and account unlock emails go out over SMTP.

| Variable | Default | Description |
|---|---|---|
| `SMTP_HOST` | — | SMTP server hostname. **When unset, no mail is sent** — the payload is only logged, which is useful in tests but means users never receive their links. |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_SECURE` | `true` | Whether to use TLS |
| `SMTP_FROM` | — | From header, e.g. `"My Project <noreply@example.com>"` |
| `SMTP_USER` | — | SMTP username, if authentication is required |
| `SMTP_PASS` | — | SMTP password, if authentication is required |

## Workflow Page Branding

One brand per Foxnox deployment. See [Branding](./branding) for what each value affects on the page.

| Variable | Default | Description |
|---|---|---|
| `WEB_BRAND_NAME` | `Foxnox` | Product or company name shown in the page header |
| `WEB_BRAND_TAGLINE` | `Account security` | Short line under the name |
| `WEB_BRAND_MARK` | `F` | Letter mark shown when no logo URL is set |
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

These apply to the `foxnox-migration` container (`dwtechs/foxnox-migration`):

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
| `LIQUIBASE_COMMAND_CONTEXTS` | ⬜ | Liquibase contexts to apply during migration |
| `TZ` | ⬜ | Timezone |

## Gatelin Variables

These are set on **Gatelin**, not on Foxnox, but they are what connects the two. See [Integration](./integration).

| Variable | Description |
|---|---|
| `PWD_CHECK_URL` | Must point at `http://<foxnox-host>:<port>/pwd/compare`. Gatelin derives the other integration endpoints from the same base: `/pwd/challenges`, `/pwd/trusted-devices/verify`, and `/pwd/login-tickets/redeem`. |
| `USER_SEARCH_URL` | Gatelin's own user lookup for login; normally the same URL Foxnox uses. |
| `ADMIN_PASSWORD_RECOVERY_URL` | Set to `/api/pwd/web/recover` so the admin login page shows a "Forgotten password?" link pointing at the Foxnox workflow. |

## Maintenance Jobs

Foxnox starts two daily UTC cron jobs with the process:

| Job | Schedule | Retention |
|---|---|---|
| Delete archived entities | 02:00 UTC | Rows archived for more than **2 months**, across passwords, tokens, policies, and trusted devices |
| Delete old history | 03:00 UTC | Rows in `log.history` older than **6 months** |

Note that these purge *archived* rows only. Expired tokens are not deleted by the job — they simply stop validating, because every lookup filters on `expiresAt`.
