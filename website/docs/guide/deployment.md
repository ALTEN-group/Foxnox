# Deployment

Foxnox is distributed as Docker images on Docker Hub:

- **`dwtechs/foxnox`** — the password service itself, including the account workflow pages
- **`dwtechs/foxnox-migration`** — the Liquibase migration container, with the full schema and seed data baked in

Two more images exist for the project itself but are not required to run it: `dwtechs/foxnox-admin` (Angular admin UI) and `dwtechs/foxnox-website` (this documentation site).

See the [Integration](./integration) page for gateway registration and seed data, and [Environment Variables](./configuration) for the full variable reference.

## Architecture

Foxnox is an **internal service**. It has no public Traefik router: browsers and API clients always reach it through the gateway, which strips the `/api` prefix and forwards to Foxnox on the internal network.

```
Browser / Client
      |
      v
  Traefik  (:80)
      |
      +-- /api/*   --> Gatelin  (auth, routing, ACL)
      |                   |
      |                   +-- /pwd/*      --> Foxnox JSON API
      |                   +-- /pwd/web/*  --> Foxnox workflow pages
      |
      +-- /docs/*  --> Documentation site
```

This matters for two reasons. First, nothing except the gateway can call `/pwd/compare`, so password checks cannot be brute-forced from outside. Second, every public URL in email links must be built with the gateway's prefix — which is what `WEB_PUBLIC_ORIGIN` and `WEB_PUBLIC_BASE` are for.

## docker-compose.yml template

Drop this file into your project and replace the placeholder values. No Foxnox source code required — all images are pulled from Docker Hub.

```yaml
name: my-project

services:
  postgres:
    image: postgres:16-alpine
    container_name: my-project-postgres-local
    hostname: my-project-postgres-local
    environment:
      TZ: Europe/Paris
      POSTGRES_USER: root
      POSTGRES_PASSWORD: root_pwd_change_me
    networks:
      - internal
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "root", "-d", "foxnox"]
      interval: 10s
      timeout: 5s
      retries: 3

  traefik:
    image: traefik:3.6.4
    container_name: my-project-traefik-local
    hostname: my-project-traefik-local
    command:
      - --providers.docker=true
      - --providers.docker.network=my-project-internal-local
      - --providers.docker.constraints=Label(`stack.name`,`my-project-local`)
      - --entryPoints.web.address=:80
      - --providers.docker.exposedByDefault=false
      - --api.insecure=true
      - --log.level=INFO
      - --accesslog=true
    ports:
      - "8100:80"
      - "8083:8080"
    networks:
      - internal
      - external
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

  foxnox_migration:
    image: dwtechs/foxnox-migration:latest
    container_name: my-project-foxnox-migration-local
    hostname: my-project-foxnox-migration-local
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      TZ: Europe/Paris
      LIQUIBASE_COMMAND_USERNAME: root
      LIQUIBASE_COMMAND_PASSWORD: root_pwd_change_me
      DB_HOST: my-project-postgres-local
      DB_PORT: 5432
      DB_NAME: foxnox
      DB_USER: foxnox
      DB_PWD: foxnox_pwd_change_me
      UPDATE: 1
      ROLLBACK: 0
      SNAPSHOT: snapshot/snapshot1
      LIQUIBASE_LOG_LEVEL: INFO
      LIQUIBASE_COMMAND_CONTEXTS: v1,oauth
    networks:
      - internal
    volumes:
      - ./docker/foxnox/data:/liquibase/data

  foxnox:
    image: dwtechs/foxnox:latest
    container_name: my-project-foxnox-local
    hostname: my-project-foxnox-local
    depends_on:
      postgres:
        condition: service_healthy
      foxnox_migration:
        condition: service_completed_successfully
    environment:
      PORT: 3000
      TZ: Europe/Paris
      DB_HOST: my-project-postgres-local
      DB_NAME: foxnox
      DB_USER: foxnox
      DB_PWD: foxnox_pwd_change_me
      # HMAC secret for password hashes and token hashes — rotating it
      # invalidates every stored hash, so treat it as permanent.
      PWD_SECRET: change_me_with_a_long_random_secret
      APP_NAME: my-project
      ENV_NAME: local
      SERVICE_NAME: my-project-foxnox-local
      # Resolves an email address to a userId
      USER_SEARCH_URL: http://my-project-msuser-local:3000/users/search
      # Public URLs for workflow pages and email deep links
      WEB_PUBLIC_ORIGIN: http://localhost:8100
      WEB_PUBLIC_BASE: /api/pwd/web
      WEB_LOGIN_RESUME_URL: http://localhost:8100/admin/login
      # Outbound mail
      SMTP_HOST: smtp.example.com
      SMTP_PORT: 587
      SMTP_SECURE: "true"
      SMTP_FROM: "My Project <noreply@example.com>"
      SMTP_USER: smtp_user
      SMTP_PASS: smtp_pwd_change_me
      # Workflow page branding
      WEB_BRAND_NAME: My Project
      WEB_BRAND_TAGLINE: Account security
      WEB_BRAND_MARK: M
      WEB_BRAND_PRIMARY_COLOR: "#1f6feb"
      WEB_BRAND_PRIMARY_HOVER_COLOR: "#1858c3"
      WEB_BRAND_SECONDARY_COLOR: "#5c6570"
      WEB_BRAND_BACKGROUND_COLOR: "#f4f6f8"
    networks:
      - internal
    # No public Traefik router on purpose: traffic is Traefik → gateway → foxnox.
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/pwd/health/ready"]
      interval: 10s
      timeout: 5s
      retries: 5

  gatelin:
    image: dwtechs/gatelin:latest
    container_name: my-project-gatelin-local
    hostname: my-project-gatelin-local
    depends_on:
      foxnox:
        condition: service_healthy
    environment:
      TZ: Europe/Paris
      # Points the gateway at the Foxnox password check
      PWD_CHECK_URL: http://my-project-foxnox-local:3000/pwd/compare
      USER_SEARCH_URL: http://my-project-msuser-local:3000/users/search
      DB_HOST: my-project-postgres-local
      DB_NAME: gatelin
      DB_USER: gatelin
      DB_PWD: gatelin_pwd_change_me
      TOKEN_SECRET: change_me_with_another_long_random_secret
      APP_NAME: my-project
      ENV_NAME: local
      SERVICE_NAME: my-project-gatelin-local
    networks:
      - internal
    labels:
      - "traefik.enable=true"
      - "stack.name=my-project-local"
      - "traefik.http.routers.gateway.rule=PathPrefix(`/api`)"
      - "traefik.http.routers.gateway.entrypoints=web"
      - "traefik.http.routers.gateway.service=gateway"
      - "traefik.http.routers.gateway.middlewares=strip-prefix"
      - "traefik.http.middlewares.strip-prefix.stripprefix.prefixes=/api"
      - "traefik.http.middlewares.strip-prefix.stripprefix.forceSlash=false"
      - "traefik.http.services.gateway.loadBalancer.server.port=3000"

networks:
  internal:
    name: my-project-internal-local
    driver: bridge
  external:
    name: my-project-external-local
    driver: bridge

volumes:
  postgres_data:
    driver: local
```

## Startup Order

The dependencies above are not decorative — Foxnox will fail to start without them:

1. **postgres** must be healthy, because Foxnox connects at boot and probes the database on every readiness check.
2. **foxnox_migration** must have completed successfully, because the schema and the seeded token types have to exist before the first request.
3. **foxnox** should be healthy before the gateway starts serving logins, otherwise the first sign-in attempts fail on `PWD_CHECK_URL`.

## Health Check

Foxnox exposes both a liveness and a readiness endpoint:

```
GET /pwd/health
GET /pwd/health/ready
```

`/pwd/health` is dependency-free and only proves the process is up. `/pwd/health/ready` additionally runs a `SELECT 1` against Postgres, so an instance that lost its database drops out of rotation instead of failing requests. Use the readiness endpoint in your container health check.

From inside the network:

```bash
curl http://my-project-foxnox-local:3000/pwd/health/ready
```

Through the gateway, if you registered the health route:

```bash
curl http://localhost:8100/api/pwd/health
```

## Database Migration

The `foxnox_migration` container is controlled by environment variables:

| Variable | Values | Description |
|---|---|---|
| `UPDATE` | `1` / `0` | When `1`: creates the database, applies all schema changesets and seed data, takes a snapshot, and creates the Foxnox DB user. This is the normal deploy mode. When `0` (and `ROLLBACK=0`): diffs the live database against the reference snapshot and generates a changelog. Development tool only. |
| `ROLLBACK` | integer > `1` | Rolls back the given number of changesets and takes a new snapshot. |
| `LIQUIBASE_SNAPSHOT` | integer | Index of the snapshot file used as the baseline for diff operations. |
| `LIQUIBASE_COMMAND_CONTEXTS` | e.g. `v1,oauth` | Liquibase contexts to activate during the update. |

**Adding your own seed data:** mount a folder containing a `changelog.xml` at `/liquibase/data`. It is applied after the core schema, so you can add your own policies or reference rows without rebuilding the image.

```yaml
foxnox_migration:
  image: dwtechs/foxnox-migration:latest
  volumes:
    - ./db/foxnox/data:/liquibase/data
  environment:
    UPDATE: 1
    # ...
```
