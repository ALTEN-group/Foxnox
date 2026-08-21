# Foxnox

[![Coverage](https://raw.githubusercontent.com/DWTechs/Foxnox/badges/badges/coverage.svg)](https://github.com/DWTechs/Foxnox/actions/workflows/test.yml)
[![admin coverage](https://raw.githubusercontent.com/DWTechs/Foxnox/badges/badges/admin-coverage.svg)](https://github.com/DWTechs/Foxnox/actions/workflows/test.yml)

Password and account-security service for the DW Techs stack. Foxnox stores credentials and auth factors (password hashes, 2FA, recovery tokens, security questions, trusted devices) and exposes:

- JSON APIs under `/pwd/…` (CRUD + compare), typically reached through Gatelin
- Server-rendered **account workflow** pages under `/pwd/web/…` (Handlebars)

User profile concerns such as **email verification** live in user management, not here.

## Account workflows

Pages live in `web/views/pages/<workflow>/`, with EN/FR copy in `web/locales/`.  
In local Docker they are served at `http://localhost:8100/api/pwd/web/…`.

Backend steps: recover and unlock mutate the `pwd` row (hash rotation /
lockout clear). Token create / deep-link / mail notify are wired for those
flows. Login challenges bind 2FA / expired-password / trusted-device pages.
TOTP crypto, security-question answer persistence, and trusted-device
persistence are still TODO.

### Password recovery (`recover/`)

| Page | Path | Use case |
|---|---|---|
| Request | `GET/POST /recover` | User forgot their password and asks for a reset link by email. |
| Sent | (after POST) | Always shown after submit to avoid account enumeration. |
| Reset | `GET/POST /recover/reset?token=…` | User opens the email link and chooses a new password. |
| Done / Invalid | — | Success, or missing/expired/invalid token. |

Driven by the **Password reset** token type.

### Two-factor authentication (`twofa/`)

| Page | Path | Use case |
|---|---|---|
| Verify | `GET/POST /2fa/verify?challenge=…` | After password OK, user must enter a TOTP code to finish sign-in. |
| Setup | `GET/POST /2fa/setup` | Authenticated user enrolls an authenticator app (QR / manual key). |
| Done / Disabled / Invalid | — | 2FA enabled, disabled after recovery, or challenge missing/expired. |

Uses `pwd.twoFactorEnabled` / `pwd.twoFactorSecret`. Bound to a **2FA challenge**
token (minted via `POST /pwd/challenges`). Successful verify consumes it and
redirects to the trusted-device prompt with a fresh challenge.

### Account recovery — lost 2FA (`account-recover/`)

| Page | Path | Use case |
|---|---|---|
| Request | `GET/POST /account-recover` | User still knows the account but cannot produce a 2FA code. |
| Sent | (after POST) | Non-enumerating confirmation that a recovery link may have been sent. |
| Challenge | `GET/POST /account-recover/challenge?token=…` | User answers enrolled security questions to prove identity. |
| Done | — | 2FA is turned off so they can sign in and re-enroll later. |

Driven by the **Account recovery** token type plus `user_security_answer`.

### Security questions (`security-questions/`)

| Page | Path | Use case |
|---|---|---|
| Setup | `GET/POST /security-questions` | User picks questions and answers used later for lost-2FA recovery. |
| Done | — | Answers stored (hashed) for future challenges. |

Backed by `security_question*` tables and `user_security_answer`. The enrollment
catalog is loaded from the DB (localized via `security_question_trans`). Protected
route in Gatelin (expects an authenticated session once wired).

### Trusted devices (`trusted-devices/`)

| Page | Path | Use case |
|---|---|---|
| Prompt | `GET/POST /trusted-devices/prompt?challenge=…` | After a successful 2FA check: “Remember this device?” |
| Done / Skipped / Invalid | — | Device trusted for a limited time, user declines, or challenge expired. |
| Manage | `GET /trusted-devices` | List remembered devices. |
| Revoke | `POST /trusted-devices` | User revokes a device they no longer control. |

Maps to `user_trusted_device` (token hash, name, UA/IP, expiry). Prompt is bound
to a **Trusted device challenge**. Manage/revoke are protected routes.

### Expired password (`password/`)

| Page | Path | Use case |
|---|---|---|
| Expired | `GET/POST /password/expired?challenge=…` | Sign-in succeeded but `pwd.pwdExpiry` has passed; user must set a new password before continuing. |
| Done | — | Password rotated; login can proceed. |

Uses an active `pwd_policy` for strength rules. Bound to an **Expired password
challenge** (not a public email token). Successful change rotates the hash and
consumes the challenge.

### Account unlock (`unlock/`)

| Page | Path | Use case |
|---|---|---|
| Request | `GET/POST /unlock` | Account locked after too many failed attempts (`failedAttempts` / `lockedUntil`). |
| Sent | (after POST) | Non-enumerating confirmation. |
| Confirm | `GET /unlock/confirm?token=…` | User opens an unlock link (or equivalent) to clear the lock. |
| Done / Invalid | — | Unlocked, or link expired. |

### Token → deep link → notify

Email-driven workflows share this pipeline:

1. Resolve `email` → `userId` via `USER_SEARCH_URL` (ms_user)
2. Create a typed `token` row (`@dwtechs/hashitaka` HMAC of plaintext stored; plaintext only in the link)
3. Build an absolute URL with `WEB_PUBLIC_ORIGIN` + `WEB_PUBLIC_BASE`
4. Call `notifyUser` — Handlebars templates under `web/emails/` + Nodemailer SMTP (`SMTP_*` env)

| Template | Token type | Deep link |
|---|---|---|
| `pwd-reset` | Password reset | `/recover/reset?token=…` |
| `account-recover` | Account recovery | `/account-recover/challenge?token=…` |
| `account-unlock` | Account unlock | `/unlock/confirm?token=…` |

In local Docker, Mailpit catches mail (`SMTP_HOST` → mailpit). Open the UI on
`http://localhost:${MAILPIT_UI_PORT:-8025}`, submit a recover form for
`admin@example.com`, and use the link from the message. Without `SMTP_HOST`,
`notifyUser` still logs the payload (useful for unit tests).

### Login challenges

Mid-login steps (2FA, expired password, trusted device) are not email tokens.
**Gatelin** runs them after password OK (`gateLoginChallenges`):

1. `POST /pwd/compare` → read `twoFactorEnabled` / `pwdExpiry` / `lockedUntil`
2. If locked → `403`
3. If password expired → mint `expired-password` challenge → **HTTP 202** `{ challengeRequired, url }`
4. Else if 2FA enabled and no valid `trusted_device` cookie → mint `2fa` → **202**
5. Else issue the session as usual

Admin login redirects the browser to `url`. After the last challenge, Foxnox
redirects to `WEB_LOGIN_RESUME_URL?ticket=…`; admin calls
`POST /gatelin/sessions/resume` with that ticket to finish the session.

| Kind | Token type | Page |
|---|---|---|
| `2fa` | 2FA challenge | `/2fa/verify?challenge=…` |
| `expired-password` | Expired password challenge | `/password/expired?challenge=…` |
| `trusted-device` | Trusted device challenge | `/trusted-devices/prompt?challenge=…` |
| (resume) | Login resume | Admin `/login?ticket=…` |

Manual mint (tests / tooling):

`POST /pwd/challenges` `{ "userId": 1, "kind": "2fa" | "expired-password" | "trusted-device" }`

## Workflow branding

One brand per Foxnox deployment, configured with `WEB_BRAND_*` env vars
(see `docker/conf/.env.dev.example`):

| Variable | Purpose |
|---|---|
| `WEB_BRAND_NAME` | Product / company name in the header |
| `WEB_BRAND_TAGLINE` | Short line under the name |
| `WEB_BRAND_MARK` | Letter mark when no logo is set |
| `WEB_BRAND_LOGO_URL` | `https://…` or root-relative logo URL |
| `WEB_BRAND_LOGO_ALT` | Logo alt text |
| `WEB_BRAND_PRIMARY_COLOR` | Main accent (`#RGB` / `#RRGGBB`) |
| `WEB_BRAND_PRIMARY_HOVER_COLOR` | Button hover accent |
| `WEB_BRAND_SECONDARY_COLOR` | Muted text / secondary |
| `WEB_BRAND_BACKGROUND_COLOR` | Page background |
| `WEB_BRAND_FOOTER_TEXT` | Optional footer copy |
| `WEB_BRAND_FOOTER_URL` | Optional footer link |

Colors are sanitized to hex and applied as CSS variables on every workflow page.
This is deployment-scoped white-labeling; multi-tenant per-consumer brands can come later.

## Out of scope here

- **Email / backup-email verification** → user management service  
- **Admin CRUD** for passwords, policies, tokens, devices → Angular app under `admin/`

## Quick links

- Dev setup and stack commands: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Data model: [doc/erd.md](./doc/erd.md)

### Linked from the admin UI

| Admin surface | Workflow |
|---|---|
| Login → “Mot de passe oublié ?” | `/pwd/web/recover` |
