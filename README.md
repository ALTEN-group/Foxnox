# Foxnox

Password and account-security service for the DW Techs stack. Foxnox stores credentials and auth factors (password hashes, 2FA, recovery tokens, security questions, trusted devices) and exposes:

- JSON APIs under `/pwd/…` (CRUD + compare), typically reached through Gatelin
- Server-rendered **account workflow** pages under `/pwd/web/…` (Handlebars)

User profile concerns such as **email verification** live in user management, not here.

## Account workflows

Pages live in `web/views/pages/<workflow>/`, with EN/FR copy in `web/locales/`.  
In local Docker they are served at `http://localhost:8100/api/pwd/web/…`.

Backend steps (token create/consume, TOTP, hashing, mail) are still stubbed in handlers; the page flows and Gatelin routes are in place.

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
| Verify | `GET/POST /2fa/verify` | After password OK, user must enter a TOTP code to finish sign-in. |
| Setup | `GET/POST /2fa/setup` | Authenticated user enrolls an authenticator app (QR / manual key). |
| Done / Disabled | — | 2FA enabled, or disabled after a successful account recovery. |

Uses `pwd.twoFactorEnabled` / `pwd.twoFactorSecret`. Verify links to account recovery when the user lost their authenticator.

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

Backed by `security_question*` tables and `user_security_answer`. Protected route in Gatelin (expects an authenticated session once wired).

### Trusted devices (`trusted-devices/`)

| Page | Path | Use case |
|---|---|---|
| Prompt | `GET/POST /trusted-devices/prompt` | After a successful 2FA check: “Remember this device?” |
| Done / Skipped | — | Device trusted for a limited time, or user declines. |
| Manage | `GET /trusted-devices` | List remembered devices. |
| Revoke | `POST /trusted-devices` | User revokes a device they no longer control. |

Maps to `user_trusted_device` (token hash, name, UA/IP, expiry). Manage/revoke are protected routes.

### Expired password (`password/`)

| Page | Path | Use case |
|---|---|---|
| Expired | `GET/POST /password/expired?challenge=…` | Sign-in succeeded but `pwd.pwdExpiry` has passed; user must set a new password before continuing. |
| Done | — | Password rotated; login can proceed. |

Uses an active `pwd_policy` for strength rules once the backend is wired. Not a public email flow — driven by a short-lived login challenge.

### Account unlock (`unlock/`)

| Page | Path | Use case |
|---|---|---|
| Request | `GET/POST /unlock` | Account locked after too many failed attempts (`failedAttempts` / `lockedUntil`). |
| Sent | (after POST) | Non-enumerating confirmation. |
| Confirm | `GET /unlock/confirm?token=…` | User opens an unlock link (or equivalent) to clear the lock. |
| Done / Invalid | — | Unlocked, or link expired. |

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
