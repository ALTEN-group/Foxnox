# Changelog

# Unreleased

  - **Audit log page:** new admin-only `Audit log` menu entry listing every tracked change across Foxnox tables (who, what, when, old → new values), newest first, filterable by date, user, entity, action and record id. Backed by the read-only `POST /foxnox/audit/search` route over the new `log.audit` view (previous snapshot, changed columns, `ARCHIVE`/`RESTORE` actions). Automatic bookkeeping writes (login counters, device usage) are `routine` and hidden by default; add them from the `Kind` filter. Hashes and secrets are never returned (`[redacted]`). The Gatelin route `searchAudit` is seeded for Super admin and Admin only (route id `116` on a fresh alpha.5 database, see `app.acls.ts`); the login challenge mint route is no longer seeded at all (internal BFF call only)
  - Admin: every grid (passwords, policies, tokens, trusted devices, branding) now sorts by `id` ascending by default instead of relying on database row order. Clicking a column header still overrides it
  - Fixed `PUT`/`POST /foxnox/preferences/:resource` failing with `Invalid "conf" ... Expected object, but received string` (e.g. when resizing a grid column): `conf` is stringified before validation, so it is now typed `json`
  - `pwd.lockedUntil` and `pwd.twoFactorEnabled` are now system-only (`readOnly`): the lock is set by failed-attempt lockout and cleared by login, password set or the unlock workflow; 2FA is toggled only by enrolment and account recovery, together with its secret. Neither is editable from the admin any more
  - Admin: `Last login at`, `Failed attempts`, `Locked until`, `Two-factor enabled` and `Password updated at` are hidden from the password edit form and history (system-only fields; logins between two edits showed up as a change in the history). They remain in the grid
  - Once set, a password's `pwdExpiry` can only be postponed by `PUT /foxnox/pwd` (`400` otherwise; clearing it stays allowed). The admin date picker starts at the stored day. Not enforced by the DB trigger, so password rotation can still set an earlier expiry
  - Updated `@dwtechs/antity-pgsql` to `0.25.0` and `@dwtechs/gatelin-express` to `0.4.0`
  - History routes now use the entity's `history()` / `getHistory` (the history middleware is removed); system-managed (`readOnly`) fields are ignored in the `pwd` and `user_device` history
  - Added password expiry rules: `pwdExpiry` must be at least tomorrow 00:00 UTC, validated in the API (`isValidPwdExpiry`), the admin form and a database trigger
  - Fixed the admin password edit failing with `null value in column "pwdHash"` (and silently wiping `twoFactorSecret`): both server-side secrets are no longer part of the admin form, so they are never sent on PUT
  - Fixed PUT on `pwd`, `pwd_policy`, `token`, `user_device` and `branding` failing with `Invalid "createdAt" ... Expected Date, but received string`: audit dates (`archivedAt`, `createdAt`, `updatedAt`) are now `readOnly`

# 0.1.0-alpha.3 (Sep 26th 2026)

  - **Branding management:**
    - Introduce `branding` entity, database schema table, triggers, and CRUD routes (`GET`, `POST`, `PUT`) with history tracking
    - Admin UI branding management component for configuring colors, fonts, logo, application mark, and footer details
    - Support dynamic branding injection into account workflow pages, email templates, and application shell
    - Add in-memory cache invalidation on branding updates so changes take effect without server restart
    - Add Docker environment variables for initial branding configuration
  - **Breaking (schema):** every timestamp column now uses `TIMESTAMPTZ` instead of a naive `TIMESTAMP`. The app writes UTC instants while the containers run a local timezone, so a naive column stored the UTC wall clock and then compared it against a local `NOW()`. Any workflow token whose TTL was shorter than the local UTC offset (2FA challenge, trusted device, login resume, expired password, password reset, account unlock, account recovery) was expired the moment it was created, so mid-login challenge pages always answered "this sign-in step is no longer valid". `delete()` now takes a `TIMESTAMPTZ` cutoff to match. Existing databases must be recreated.
  - Added a PostgreSQL contract test that mints a token under a non-UTC session timezone and asserts it is still valid
  - **Breaking (API):** mutating routes on history-tracked tables (`POST`/`PUT`/`POST /archive` on passwords, policies, tokens and trusted devices) now require `x-consumer-user-id` and `x-consumer-name` and answer **401** without them. `antity-pgsql` only stamps `creatorId`/`creatorName` when a consumer is present, so a header-less write used to fail inside the history trigger with an opaque database error.
  - **Breaking (API):** the password router moved from the Foxnox root to `/foxnox/pwd`, like every other resource: `POST /foxnox/compare`, `/foxnox/search`, `/foxnox/archive`, `GET /foxnox/schema`, `GET /foxnox/:id/history`, `POST`/`PUT /foxnox/` become `/foxnox/pwd/compare`, `/foxnox/pwd/search`, `/foxnox/pwd/archive`, `/foxnox/pwd/schema`, `/foxnox/pwd/:id/history`, `POST`/`PUT /foxnox/pwd`. The Gatelin resource `foxnox` is renamed `foxnox/pwd` in the seed data (existing databases must be re-seeded) and `GATELIN_PWD_CHECK_URL` must now end in `/foxnox/pwd/compare`
  - **Fix:** admin table-view preferences never reached Foxnox. Two causes: the admin's `apiPrefix` had no trailing slash (the table-views library requests `${apiPrefix}preferences`, which produced `/api/foxnoxpreferences/...`), and `/foxnox/preferences` was not registered in Gatelin after preferences moved into Foxnox, so Gatelin answered `Route not found`. The admin now uses `/api/foxnox/` with relative endpoint paths (same convention as the Gatelin admin), and the seed data registers the `foxnox/preferences` resource with its list/create/update/delete routes for the Super admin and Admin roles. The grid used to swallow the failure and silently show its built-in "Default view"
  - **Fix:** selecting a table view in the admin returned `403 Forbidden`. The table-views grid re-sends every view, system templates included, whenever the active one changes, but the `PUT /foxnox/preferences/:resource` pre-flight (now `assertRowsOwnedOrTemplate`) only accepted the caller's own unlocked rows. It now accepts rows that are the caller's own or system templates of the requested resource; templates are still never modified (selecting one records the caller's choice, editing one forks a personal copy), and another user's rows or another resource's ids are still rejected with 403
  - Admin passwords grid: `Password expiry`, `Locked until` and `Last login at` show a red cross when empty, like boolean columns; `createdAt` is visible in the locked `Default` passwords view
  - Require current password verification when replacing security question answers in web workflows
  - Track failed login attempts and enforce account compare lockouts
  - Compare grant check on internal challenge minting: challenges can only be minted for users who recently passed `POST /foxnox/compare`
  - Enhance TOTP verification with development mock code support and improve CSRF error handling with a session expiration page
  - Fixed the migration silently half-applying: the `token_type` and security-question seeds inserted without a creator identity, which the history trigger rejects, and `entrypoint.sh` ran on to `createUser` and exited 0 regardless. Each step now aborts on failure.
  - `scripts/setup-mocks.sh` sends a consumer identity when seeding mock passwords
  - Update Gatelin version to `0.1.0-alpha.9` in development environment
  - Add k6 performance testing and RESTler API fuzzing implementation patterns, instructions, agents, and prompts
  - Add specialized agents for audit remediation, codebase auditing, and E2E testing

# 0.1.0-alpha.2 (Aug 29th 2026)

  - Adopt `@dwtechs/gatelin-express` for Gatelin consumer identity and ACL header handling, replacing hand-rolled header parsing in `middlewares/acl.js`:
    - `mapConsumer` now delegates to `getConsumer` (still optional when no consumer headers are present, for internal flows)
    - `enforceAcl` now delegates `x-acl-fields`/`x-acl-conditions` parsing and validation to `getAcl`, keeping only entity-specific field/type checks (`validateAcl`) local
    - Field allow-list projection on write rows now uses the shared `stripUnallowedFields` middleware instead of a local implementation
  - Consumer header validation errors are now more precise (e.g. `400 "Missing consumer nickname"`) instead of a generic `403 "Invalid consumer headers"`
  - Introduce Fox logo

# 0.1.0-alpha.1 (Aug 27th 2026)

  - First public alpha: credential storage, password policies, 2FA, recovery tokens, trusted devices, account workflow pages, and admin UI
  - Distributed as `ghcr.io/alten-group/foxnox` and `ghcr.io/alten-group/foxnox-migration`
