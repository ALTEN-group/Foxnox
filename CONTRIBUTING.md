# Contributing to Foxnox

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) (for running tests locally)

## First-time Setup

### 1. Generate the dev environment file

```sh
./scripts/setup-env.sh
```

This generates `docker/conf/.env.dev` from the example file and fills in random values for all passwords and secrets (including `FOXNOX_PWD_SECRET`).

### 2. Start the stack

```sh
./scripts/start-dev.sh
```

Builds and starts all services via Docker Compose using `docker/conf/.env.dev`. The DB comes up empty of user passwords — those are seeded in the next step.

### 3. Seed mock user passwords

```sh
./scripts/setup-mocks.sh
```

Waits for foxnox to be healthy, then calls `POST /pwd/` (which uses `@dwtechs/passken-express` `create` to generate + hash server-side) to create a password for each mock user in `mocks/ms_user/src/data/users.js`. Plaintexts are:

- printed once to your terminal so you can save them for manual login;
- substituted into `swagger/src/foxnox.openapi.json` (replacing the `__PWD_<userId>__` tokens from the checked-in `.example.json`), which is then reloaded by restarting the swagger container.

Re-run any time you want to rotate the mock credentials — the script clears the previous mock rows first so `POST /pwd/compare` picks up the new hashes.

## Development

### Start / Restart

After the first-time setup above, `./scripts/start-dev.sh` is also the everyday command to (re)build and (re)start the stack. Mock passwords persist in Postgres across restarts, so you don't need to re-run `setup-mocks.sh` unless you also ran `reset-db.sh` or want to rotate credentials.

### Stop

```sh
./scripts/stop-dev.sh
```

Stops and removes all containers and the postgres volume.

```sh
./scripts/stop-dev.sh --rmi   # also remove Docker images
```

## Reset

### Reset the database only

Removes the postgres and migration containers and the postgres data volume. The next `start-dev.sh` will re-run all migrations from scratch.

```sh
./scripts/reset-db.sh
```

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

## Production

### Images

Foxnox ships two releasable images:

| Image | Description |
|---|---|
| `dwtechs/foxnox` | The Node.js gateway service. Runs continuously as an API server. |
| `dwtechs/foxnox-migration` | A one-shot Liquibase container. Applies the Foxnox DB schema and core seed data, then exits. The gateway will not start until this container completes successfully. |

The `migration` image has the full Foxnox schema and core data baked in. Consumers can mount their own Foxnox registration data (services, routes, roles) at `/liquibase/data` without rebuilding the image — see [DB Migration](#db-migration) below.

Two additional images exist for the Foxnox project itself but are not required by consumers:

| Image | Description |
|---|---|
| `dwtechs/foxnox-admin` | Angular admin frontend. |
| `dwtechs/foxnox-website` | Static documentation website. |

### Build production images

Requires `docker/conf/.env.prod` to exist. Create it by copying `.env.dev.example` and filling in production values (passwords, secrets, versions).

Builds production images from their respective `dockerfile.prod` files. Each image is tagged as `dwtechs/foxnox-<target>:<version>` and `dwtechs/foxnox-<target>:latest`, where `<version>` is read from `package.json`.

```sh
./scripts/build-prod.sh                   # build all four images
./scripts/build-prod.sh gateway           # gateway only
./scripts/build-prod.sh migration         # migration only
./scripts/build-prod.sh admin             # admin only
./scripts/build-prod.sh website           # website only
./scripts/build-prod.sh gateway migration # multiple targets
```

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
2. Applies all baked-in schema changesets (`gateway/versions/`)
3. Applies consumer data from `/liquibase/data/changelog.xml` if the file exists
4. Takes a JSON snapshot of the current schema
5. Creates the Foxnox DB user with the correct grants

**Adding consumer app data:** Mount a folder containing a `changelog.xml` to `/liquibase/data` in the migration container. That changelog is applied after the core schema, in the same transaction scope.

```yaml
foxnox_migration:
  image: dwtechs/foxnox-migration:latest
  volumes:
    - ./db/foxnox/data:/liquibase/data
  environment:
    UPDATE: 1
    # ...
```
