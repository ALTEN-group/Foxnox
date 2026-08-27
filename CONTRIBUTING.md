# Contributing to Foxnox

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js 24](https://nodejs.org/) (for running tests locally)

## First-time Setup

### 1. Generate the dev environment file

```sh
./scripts/setup-env.sh
```

This generates `docker/conf/.env.dev` from the example file and fills in random values for all passwords and secrets (including `FOXNOX_PWD_SECRET`).

Public npm and Alpine repositories work by default. `NPMRC` and
`APK_REPOSITORY` are optional BuildKit secrets for contributors who use private
mirrors; never commit registry credentials.

### 2. Start the stack

```sh
./scripts/start-dev.sh
```

Builds and starts all services via Docker Compose using `docker/conf/.env.dev`.

Mock user passwords are **not** Liquibase seed data — they are created at runtime. So whenever the database comes up empty, `start-dev.sh` finishes by running `setup-mocks.sh --if-missing`, which seeds them and prints the plaintexts. **Save them — you need them to log in.** When passwords already exist the step is skipped and your existing credentials are left alone.

### 3. Rotate the mock passwords (optional)

```sh
./scripts/setup-mocks.sh
```

Waits for foxnox to be healthy, then calls `POST /foxnox/` (which uses `@dwtechs/passken-express` `create` to generate + hash server-side) to create a password for each mock user in `mocks/ms_user/src/data/users.js`. Plaintexts are:

- printed once to your terminal so you can save them for manual login;
- substituted into `swagger/src/foxnox.openapi.json` (replacing the `__PWD_<userId>__` tokens from the checked-in `.example.json`), which is then reloaded by restarting the swagger container.

Run it without a flag any time you want to rotate the mock credentials — it clears the previous mock rows first so `POST /foxnox/compare` picks up the new hashes.

> If login ever fails with a **404 on `POST /api/gatelin/sessions`**, this is almost always the cause: Gatelin relays the 404 that Foxnox returns when a user has no `pwd` row. Run `./scripts/setup-mocks.sh`.

## Development

### Account workflow pages (Handlebars)

See [website/docs/guide/workflows.md](./website/docs/guide/workflows.md) for use cases and page maps.

Operational paths (local Docker base `http://localhost:8100`):

| Flow | Path |
|---|---|
| Password reset | `/api/foxnox/web/recover`, `/api/foxnox/web/recover/reset?token=…` |
| 2FA | `/api/foxnox/web/2fa/verify?challenge=…`, `/api/foxnox/web/2fa/setup` |
| Lost 2FA recovery | `/api/foxnox/web/account-recover`, `…/challenge?token=…` |
| Security questions | `/api/foxnox/web/security-questions` |
| Trusted devices | `/api/foxnox/web/trusted-devices/prompt?challenge=…`, `/api/foxnox/web/trusted-devices` |
| Expired password | `/api/foxnox/web/password/expired?challenge=…` |
| Unlock | `/api/foxnox/web/unlock`, `/api/foxnox/web/unlock/confirm?token=…` |
| Mint login challenge (API) | `POST /api/foxnox/challenges` `{ userId, kind }` |

Requires Gatelin `gatelin-data` changesets 05–10. Run Liquibase so login challenge token types exist.

### Start / Restart

After the first-time setup above, `./scripts/start-dev.sh` is also the everyday command to (re)build and (re)start the stack. Mock passwords persist in Postgres across restarts, so the seeding step is skipped and your credentials stay put. You only need `setup-mocks.sh` directly when you want to rotate them.

### Stop

```sh
./scripts/stop-dev.sh
```

Stops and removes all containers and the postgres volume. Because the volume goes away, the next `start-dev.sh` comes up on an empty database and re-seeds fresh mock passwords.

```sh
./scripts/stop-dev.sh --rmi   # also remove Docker images
```

## Reset

### Reset the database only

Removes the postgres and migration containers and the postgres data volume, then restarts the stack (migrations re-run from scratch, and `start-dev.sh` seeds fresh mock user passwords on the empty database).

```sh
./scripts/reset-db.sh
```

Save the plaintext passwords it prints — you’ll need them to log in.

### Reset the gateway service only

Removes only the Foxnox container and image, leaving postgres and other services intact.

```sh
./scripts/reset-foxnox.sh
```

### Reset the admin frontend only

Removes the admin container, image, and node_modules volume so it rebuilds from scratch on next start.

```sh
./scripts/reset-admin.sh
```

## Tests

Run from the project root (requires `npm install` first):

```sh
npm test                  # run all tests
npm run test:watch        # watch mode
npm run test:coverage     # with coverage report
```

See [tests/README.md](tests/README.md) for more details.

### PostgreSQL contract tests

```sh
./scripts/test-db.sh
```

Starts an isolated PostgreSQL container, applies the Liquibase changelog, and
runs every `tests/db/pwd/*.sql` file as the application database user.
The stack and its data are removed after the run. This is a host Docker
workflow, not an npm/Jest test — do not run it from the Foxnox app container.

### Admin unit tests

```sh
cd admin
npm test                  # Vitest watch mode
npm run test:coverage     # CI / coverage
```

### Admin end-to-end tests (Playwright)

The e2e suite (`admin/e2e/`) drives the admin UI end-to-end through Traefik, logs in with a mock persona from `swagger/src/foxnox.openapi.json`, and exercises the same routing path a real browser hits (Traefik → admin → Gatelin → Foxnox).

Both flows below require:

- `./scripts/start-dev.sh` running.
- `./scripts/setup-mocks.sh` executed at least once (so `swagger/src/foxnox.openapi.json` has mock passwords the tests read via `admin/e2e/helpers/credentials.ts`).

#### In Docker (recommended, no local install)

```sh
./scripts/e2e.sh                            # full suite
./scripts/e2e.sh --grep "login"             # forward flags to `playwright test`
./scripts/e2e.sh --reporter=html            # writes admin/playwright-report/
./scripts/e2e.sh -- playwright show-report  # arbitrary command after `--`
```

Runs the tests in a dedicated `admin-e2e` container (`mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble`, built from `admin/e2e-dockerfile`). The container lives behind the `e2e` Compose profile, so `docker compose up` and `start-dev.sh` deliberately skip it — it spins up on demand, runs to completion, and is removed (`--rm`). It hits Traefik over the internal Docker network at `http://traefik/foxnox/` (configurable via `ADMIN_E2E_BASE_URL` in `docker/conf/.env.dev`). Test artifacts land back on the host at `admin/test-results/` and `admin/playwright-report/`.

Pin `PLAYWRIGHT_VERSION` in `.env.dev` to whatever `admin/package.json`'s `@playwright/test` resolves to.

#### On the host (fast iteration, UI mode)

```sh
cd admin
npm run e2e:install       # once per machine — downloads Chromium
npm run e2e               # runs against Traefik on localhost:8100
npm run e2e:ui            # Playwright's interactive UI mode
```

Prefer this when iterating on a specific test — the UI mode and Playwright inspector need a display, which the containerized flow doesn't provide.

The same Docker flow runs in CI via `.github/workflows/admin-e2e.yml` on pull requests that touch admin, docker, mocks, scripts, swagger, or the workflow itself.

## Production

### Images

Foxnox ships two releasable images:

| Image | Description |
|---|---|
| `ghcr.io/alten-group/foxnox` | The Node.js password service, account workflow pages, and bundled Angular admin UI. Runs continuously as an API server and serves the admin on a dedicated internal port when `ADMIN_PORT` is set. |
| `ghcr.io/alten-group/foxnox-migration` | A one-shot Liquibase container. Applies the Foxnox DB schema and core seed data, then exits. The gateway will not start until this container completes successfully. |

The `migration` image has the full Foxnox schema and core data baked in. Consumers can mount their own Foxnox registration data (services, routes, roles) at `/liquibase/data` without rebuilding the image — see [DB Migration](#db-migration) below.

Documentation is published to GitHub Pages from `website/`; it is not a Docker image.

### Build production images

Requires `docker/conf/.env.prod` to exist. Create it from
`docker/conf/.env.prod.example`, replace placeholder values, and set
`USER_SEARCH_URL` to the production user-management search endpoint. Production
does not include the mock user service.

Builds production images from their respective `dockerfile.prod` files. Each image is tagged under `ghcr.io/alten-group/` with `<version>` and `latest`, where `<version>` is read from `package.json`.

```sh
./scripts/build-prod.sh                   # build API and migration
./scripts/build-prod.sh api               # Foxnox API + bundled admin
./scripts/build-prod.sh migration         # migration only
./scripts/build-prod.sh api migration     # multiple targets
```

### Publish to GHCR

Images are published automatically via the `.github/workflows/publish.yml` workflow when a GitHub Release is created. Publishing is scoped to the `ALTEN-group` org — `GITHUB_TOKEN` is sufficient, no PAT is needed.

### Maintainer weekly audit

The public weekly workflow always runs `npm audit`, Biome, outdated, and TODO scans and opens an audit issue.

Copilot CLI, APM (`apm.yml` / `apm.lock.yaml`), and `audit-fix.yml` stay in this repository so the ALTEN maintainer pipeline is versioned with the product. Those steps run only on `ALTEN-group/Foxnox` when `COPILOT_GITHUB_TOKEN` is set; forks skip them. Configure that secret (and optional `COPILOT_AUDITS_MODEL`) on the canonical repo.

Each release produces the API (with bundled admin) and migration images with the following tag variants (for example,
release `v0.1.0-alpha.1`):

| Tag | Example |
|---|---|
| Full semver | `0.1.0-alpha.1` |
| Major.minor | `0.1` |
| Major | `0` |
| Floating | `latest` |

Images include SBOM and provenance attestations (SLSA) by default.

### Start production environment

Requires images to be built first (or pulled from the registry).

```sh
./scripts/start-prod.sh
```

Starts all services via `docker/docker-compose.prod.yml` using `docker/conf/.env.prod`.

### DB Migration

The `foxnox_migration` container is controlled by environment variables:

| Variable | Values | Description |
|---|---|---|
| `UPDATE` | `1` / `0` | When `1`: creates the DB, applies all schema changesets, runs consumer data (if mounted), takes a snapshot, creates the foxnox DB user. This is the normal deploy mode. When `0` (and `ROLLBACK=0`): runs a diff between the live DB and the reference snapshot, generates a `.sql` diff changelog in `versions/generated/`, and syncs the changelog. Development tool only. |
| `ROLLBACK` | integer > `1` | Rolls back the given number of changesets and takes a new snapshot. |
| `LIQUIBASE_SNAPSHOT` | integer | Index of the snapshot file to use as baseline for diff operations. |
| `LIQUIBASE_COMMAND_CONTEXTS` | e.g. `v1,oauth` | Liquibase contexts to activate during update. |

When `UPDATE=1`, the container runs the following steps in order:
1. Creates the database if it does not exist
2. Applies all baked-in schema changesets (`db/liquibase/foxnox/versions/`)
3. Applies consumer data from `/liquibase/data/changelog.xml` if the file exists
4. Takes a JSON snapshot of the current schema
5. Creates the Foxnox DB user with the correct grants

**Adding consumer app data:** Mount a folder containing a `changelog.xml` to `/liquibase/data` in the migration container. That changelog is applied after the core schema, in the same transaction scope.

```yaml
foxnox_migration:
  image: ghcr.io/alten-group/foxnox-migration:0.1.0-alpha.1
  volumes:
    - ./db/foxnox/data:/liquibase/data
  environment:
    UPDATE: 1
    # ...
```
