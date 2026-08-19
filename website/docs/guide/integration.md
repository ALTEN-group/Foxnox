# Integration

Foxnox does not sit on the public internet by itself. Getting it working means wiring up three connections: the **gateway** in front of it, your **user management** service beside it, and the **public URLs** users will see.

## 1. Point the Gateway at Foxnox

The gateway needs one variable to find Foxnox:

```
PWD_CHECK_URL=http://my-project-foxnox-local:3000/pwd/compare
```

Everything else is derived from that same base, so there is nothing more to configure:

| Derived URL | Used for |
|---|---|
| `{base}/pwd/challenges` | Minting a 2FA / expired-password / trusted-device challenge |
| `{base}/pwd/trusted-devices/verify` | Checking the `trusted_device` cookie to skip 2FA |
| `{base}/pwd/login-tickets/redeem` | Redeeming the one-shot ticket that finishes a session |

Use the container hostname on the internal Docker network, not the public URL. Foxnox has no public route, and routing password checks back out through Traefik would expose them.

## 2. Point Foxnox at User Management

Foxnox knows users only by numeric ID. When a user types their email address into the "forgot password" form, Foxnox has to translate it:

```
USER_SEARCH_URL=http://my-project-msuser-local:3000/users/search
```

Without this variable, the email-driven workflows (password recovery, account unlock, lost-2FA recovery) cannot resolve an address and will silently show their non-enumerating confirmation page without sending anything.

## 3. Set the Public URLs

Because requests arrive through the gateway, Foxnox cannot work out its own public address. Tell it explicitly:

```
WEB_PUBLIC_ORIGIN=https://app.example.com
WEB_PUBLIC_BASE=/api/pwd/web
WEB_LOGIN_RESUME_URL=https://app.example.com/admin/login
```

`WEB_PUBLIC_BASE` is the gateway prefix (`/api`) plus Foxnox's own mount (`/pwd/web`). If you change the gateway's strip-prefix rule, change this too — otherwise every reset link in every email will 404.

## 4. Register Foxnox in the Gateway Database

The gateway only forwards requests that match a registered route, so Foxnox's endpoints have to exist as rows in the gateway's database. Foxnox ships this seed data at `db/liquibase/gatelin-data/`; mount that folder into the gateway's migration container:

```yaml
gatelin_migration:
  image: dwtechs/gatelin-migration:latest
  volumes:
    - ./db/liquibase/gatelin-data/:/liquibase/data
```

The seed registers:

| Changeset | What it adds |
|---|---|
| `01-service.sql` | The `foxnox` service, with an empty pattern because the password router is mounted at the Express root |
| `02-resource.sql` | Resources `pwd`, `pwd/tokens`, `pwd/policies`, `pwd/trusted-devices` |
| `03-route.sql` | The 25 JSON CRUD routes, all `protected` |
| `04-permission.sql` | Grants those routes to the **Super admin** (role 1) and **Admin** (role 2) roles |
| `05`–`08` | The `pwd/web` resource and every account workflow page route |
| `09-route-challenges.sql` | The `pwd/challenges` resource and the challenge-minting route |
| `10-cors.sql` | Allowed origins |

### Protected vs. public routes

This distinction is the heart of the integration, and it is easy to get wrong. A route registered as `protected` requires a valid session; a public one does not.

| Route group | Protected | Why |
|---|---|---|
| All JSON CRUD (`/pwd/…`) | ✅ | Administrative data; only admins should read or write it |
| `/pwd/challenges` | ✅ | Only the gateway mints challenges |
| `/pwd/web/recover`, `/pwd/web/unlock` | ⬜ | The user has forgotten their password — by definition they cannot be signed in |
| `/pwd/web/2fa/verify`, `/pwd/web/password/expired`, `/pwd/web/trusted-devices/prompt` | ⬜ | Mid-login: the password was accepted but no session exists yet. Access is gated by the challenge token in the URL, not by a session. |
| `/pwd/web/account-recover` | ⬜ | The user cannot produce a 2FA code, so they cannot sign in |
| `/pwd/web/2fa/setup`, `/pwd/web/security-questions`, `/pwd/web/trusted-devices` | ✅ | Managing your own security settings requires proving who you are first |

## 5. Seed the First Passwords

A fresh Foxnox database has a schema, seeded token types, and a default password policy — but no passwords. Create one per user by posting the user IDs; the service generates and hashes the plaintext itself:

```
POST /api/pwd/
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    { "userId": 1 },
    { "userId": 2 }
  ]
}
```

The response contains the generated plaintext **once**. Save it or send it to the user immediately; it is not recoverable afterwards. See [Passwords](./api-passwords#create-passwords).

## 6. Link the Workflows from Your Frontend

Foxnox pages are only useful if users can reach them. Two links matter:

| Where | Link to |
|---|---|
| Login page, "Forgotten password?" | `/api/pwd/web/recover` |
| Account settings, "Two-factor authentication" | `/api/pwd/web/2fa/setup` |
| Account settings, "Remembered devices" | `/api/pwd/web/trusted-devices` |

For the admin UI shipped with the gateway, setting `ADMIN_PASSWORD_RECOVERY_URL=/api/pwd/web/recover` adds the first link automatically.

Your login code also has to handle the **202 challenge response**, or users with 2FA enabled will never be able to sign in. See [Frontend Integration](./frontend).

## Verifying the Integration

Work through these in order — each one depends on the last:

```bash
# 1. Foxnox is up and can reach its database
docker exec my-project-foxnox-local wget -qO- http://localhost:3000/pwd/health/ready

# 2. The gateway can reach Foxnox
docker exec my-project-gatelin-local nc -zv my-project-foxnox-local 3000

# 3. A workflow page renders through the gateway
curl -i http://localhost:8100/api/pwd/web/recover

# 4. A login succeeds end to end
curl -i -X POST http://localhost:8100/api/gateway/sessions \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","pwd":"<plaintext>"}'
```

Step 3 returning **404** almost always means the `pwd/web` routes were not seeded into the gateway database. Step 4 returning **202** is not a failure — it means a login challenge is required, which is the subject of [Login Challenges](./api-challenges).
