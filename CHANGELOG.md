# Changelog

# Unreleased

  - **Breaking (schema):** every timestamp column now uses `TIMESTAMPTZ` instead of a naive `TIMESTAMP`. The app writes UTC instants while the containers run a local timezone, so a naive column stored the UTC wall clock and then compared it against a local `NOW()`. Any workflow token whose TTL was shorter than the local UTC offset (2FA challenge, trusted device, login resume, expired password, password reset, account unlock, account recovery) was expired the moment it was created, so mid-login challenge pages always answered "this sign-in step is no longer valid". `delete()` now takes a `TIMESTAMPTZ` cutoff to match. Existing databases must be recreated.
  - Added a PostgreSQL contract test that mints a token under a non-UTC session timezone and asserts it is still valid
  - **Breaking (API):** mutating routes on history-tracked tables (`POST`/`PUT`/`POST /archive` on passwords, policies, tokens and trusted devices) now require `x-consumer-user-id` and `x-consumer-name` and answer **401** without them. `antity-pgsql` only stamps `creatorId`/`creatorName` when a consumer is present, so a header-less write used to fail inside the history trigger with an opaque database error.
  - Fixed the migration silently half-applying: the `token_type` and security-question seeds inserted without a creator identity, which the history trigger rejects, and `entrypoint.sh` ran on to `createUser` and exited 0 regardless. Each step now aborts on failure.
  - `scripts/setup-mocks.sh` sends a consumer identity when seeding mock passwords

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
