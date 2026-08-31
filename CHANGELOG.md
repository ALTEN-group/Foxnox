# Changelog

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
