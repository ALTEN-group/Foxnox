# Passwords

The `pwd` resource is the core of Foxnox: one row per user, holding the hash and every piece of state that can block a sign-in.

Paths below use Foxnox's internal `/foxnox/…` mount. Gatelin typically exposes
the same routes publicly under `/api/foxnox/…`; a custom BFF may use another
public prefix.

## Compare a Password

The one endpoint the BFF calls on every login. Lockout is checked first: if `lockedUntil` is still in the future, Foxnox returns **403** without comparing the password. Otherwise it verifies the plaintext against the stored hash and, on success, returns the public `pwd` row so the caller can decide whether anything else stands in the way of a session.

```
POST /foxnox/compare
Content-Type: application/json

{
  "userId": 1,
  "pwd": "user_plaintext_password"
}
```

**Response (200 OK):**

```json
{
  "rows": [
    {
      "id": 1,
      "userId": 1,
      "pwdUpdatedAt": "2026-01-15T09:12:00.000Z",
      "pwdExpiry": "2026-04-15T09:12:00.000Z",
      "failedAttempts": 0,
      "lockedUntil": null,
      "lastLoginAt": null,
      "twoFactorEnabled": true,
      "archived": false
    }
  ]
}
```

The returned row never contains `pwdHash` or `twoFactorSecret` — both are marked private and stripped before serialization, even though the service reads them internally.

`lastLoginAt` is returned and can be written as metadata, but Foxnox does not
set it automatically when a password comparison succeeds.

**Response (401 Unauthorized):** the password does not match. Foxnox increments `failedAttempts` and, once the in-force policy's `maxFailedAttempts` is reached, sets `lockedUntil`.

**Response (403 Forbidden):** `lockedUntil` is still in the future. Compare does not try the password while the account is locked, so a correct guess during the lock window is refused as well.

This response is deliberately more than a yes/no. `twoFactorEnabled`, `pwdExpiry`, and `lockedUntil` are exactly what the BFF needs to decide between issuing a session and raising a [login challenge](./api-challenges). A locked account never reaches that decision — Foxnox answers 403 itself.

## Search Passwords

```
POST /foxnox/search
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "pagination": true,
  "first": 0,
  "limit": 10,
  "sortField": "userId",
  "sortOrder": "ASC",
  "filters": {
    "userId": { "value": 1, "matchMode": "=" }
  }
}
```

**Response (200 OK):** `{ "rows": [...], "total": 42 }` — `total` is the count before pagination, and is only included when `pagination` is `true`.

Every field marked filterable can appear in `filters`, which makes this the endpoint for administrative questions like "who is locked out right now?":

```json
{
  "filters": {
    "lockedUntil": { "value": "2026-08-19T00:00:00.000Z", "matchMode": "after" }
  }
}
```

## Create Passwords

Note what is **not** in the request body: a password. You send user IDs, and Foxnox generates a policy-compliant plaintext and hashes it server-side. This keeps plaintext out of your logs and request traces.

```
POST /foxnox/
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    { "userId": 1 },
    { "userId": 2 }
  ]
}
```

**Response (200 OK):**

```json
{
  "rows": [
    { "id": 1, "userId": 1, "pwd": "Xk7#mQp2$vLz" },
    { "id": 2, "userId": 2, "pwd": "Rt9!wBn4&hYc" }
  ]
}
```

The `pwd` field is the **only time** the plaintext is ever returned. It is not stored anywhere in recoverable form, so deliver it to the user immediately or discard it and use the recovery workflow instead.

Generation follows the in-force [password policy](./api-policies) — length, character classes, and whether symbols are required. The generator is initialized at process start; restart Foxnox after changing those generation rules.

## Update Passwords

```
PUT /foxnox/
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    {
      "id": 1,
      "failedAttempts": 0,
      "lockedUntil": null
    }
  ]
}
```

**Response (200 OK):** the updated rows.

### Updatable fields

| Field | Description |
|---|---|
| `pwdUpdatedAt` | Timestamp of the last rotation |
| `pwdExpiry` | When the password must be changed; a past date triggers the expired-password challenge on next login |
| `failedAttempts` | Failed attempt counter |
| `lockedUntil` | Lock expiry; set to `null` to unlock immediately |
| `lastLoginAt` | Optional login timestamp maintained by the BFF or an administrator; password comparison does not update it |
| `twoFactorEnabled` | Turn 2FA on or off |

Clearing `lockedUntil` is how an administrator unlocks an account without waiting for the lock to lapse or sending an unlock email.

`userId` cannot be changed after creation, and there is no way to set a hash directly through this endpoint — password changes go through the [recovery](./workflow-recover) or [expired password](./workflow-password-expired) workflows, which rotate the hash properly.

## Get Password History

```
GET /foxnox/:id/history
Authorization: Bearer <access_token>
```

Returns the audit trail for one row, built from database triggers that record every change into `log.history`. Useful for answering "when did this account get locked, and who unlocked it?". History older than six months is purged nightly.

## Archive Passwords

```
POST /foxnox/archive
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    { "id": 1 },
    { "id": 2 }
  ]
}
```

**Response (204 No Content):** rows are soft-deleted — flagged `archived` with an `archivedAt` timestamp rather than removed. They stop matching logins immediately, and the nightly cleanup job deletes them for good after two months.

## Get Entity Schema

```
GET /foxnox/schema
Authorization: Bearer <access_token>
```

Returns the field definitions — types, minimums and maximums, which operations each field participates in, and which are required. The admin UI uses this to build its forms, so it never drifts out of sync with the backend.
