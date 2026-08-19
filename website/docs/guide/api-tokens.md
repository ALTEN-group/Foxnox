# Tokens

A token is a single-use, time-limited secret that proves the holder followed a link Foxnox sent them, or completed a step Foxnox asked for. Every reset email, unlock link, and login challenge is a token.

## How It Works

The security property that matters here is that **Foxnox never stores the token itself**. When a token is created:

1. A random plaintext value is generated.
2. That plaintext is HMAC-hashed with `PWD_SECRET` and only the hash is written to the `token` row.
3. The plaintext is returned once, to be embedded in a URL.

When the user comes back with `?token=…`, Foxnox hashes what it received and looks for a matching row. A dump of the `token` table is therefore useless to an attacker — the hashes cannot be replayed as links.

Each token belongs to a **token type**, which carries the rules rather than hard-coding them:

| Token type | TTL | Max attempts | Used by |
|---|---|---|---|
| Email verification | 24 h | 5 | Reserved for user management |
| Backup email verification | 24 h | 5 | Reserved for user management |
| Password reset | 30 min | 3 | [Password recovery](./workflow-recover) |
| Account recovery | 60 min | 3 | [Lost 2FA recovery](./workflow-account-recover) |
| Account unlock | 30 min | 3 | [Account unlock](./workflow-unlock) |
| 2FA challenge | 10 min | 5 | [Two-factor authentication](./workflow-twofa) |
| Expired password challenge | 15 min | 3 | [Expired password](./workflow-password-expired) |
| Trusted device challenge | 10 min | 3 | [Trusted devices](./workflow-trusted-devices) |
| Login resume | 10 min | 1 | Finishing a session after challenges |

`maxAttempts` bounds guessing: each failed verification increments `attempts`, and once the ceiling is reached the token is dead even though it has not expired. Successful use stamps `verifiedAt`, which is what makes tokens single-use.

You will rarely create tokens through this API — the workflows mint their own. It exists mainly so administrators can inspect and revoke outstanding links.

## Search Tokens

```
POST /pwd/tokens/search
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "pagination": true,
  "sortField": "expiresAt",
  "sortOrder": "DESC",
  "filters": {
    "userId": { "value": 1, "matchMode": "=" }
  }
}
```

**Response (200 OK):** `{ "rows": [...], "total": 7 }`. The `hash` field is private and never returned, so this endpoint can show that a token exists without exposing anything usable.

To list only tokens that are still live:

```json
{
  "filters": {
    "verifiedAt": { "value": null, "matchMode": "IS" },
    "expiresAt": { "value": "2026-08-19T00:00:00.000Z", "matchMode": "after" }
  }
}
```

## Get Token History

```
GET /pwd/tokens/:id/history
Authorization: Bearer <access_token>
```

## Create Tokens

```
POST /pwd/tokens/
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    {
      "typeId": 3,
      "userId": 1,
      "expiresAt": "2026-08-19T18:00:00.000Z"
    }
  ]
}
```

**Response (200 OK):** the created rows, without `hash`.

### Token fields

| Field | Required | Description |
|---|---|---|
| `typeId` | ✅ | ID of the token type, which sets the TTL and attempt ceiling |
| `userId` | ✅ | User the token belongs to |
| `expiresAt` | ⬜ | Explicit expiry; defaults to now plus the type's TTL |
| `attempts` | ⬜ | Failed verification counter, starts at `0` |
| `verifiedAt` | ⬜ | Set when the token is consumed |

## Update Tokens

```
PUT /pwd/tokens/
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    { "id": 1, "expiresAt": "2026-08-19T19:00:00.000Z" }
  ]
}
```

**Response (200 OK):** the updated rows. Only `attempts`, `expiresAt`, and `verifiedAt` are writable — the hash, type, and user are fixed at creation.

## Archive Tokens

```
POST /pwd/tokens/archive
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    { "id": 1 }
  ]
}
```

**Response (204 No Content):** archiving is how you revoke a link that has been sent but should no longer work — every token lookup filters out archived rows.

Note that expired tokens do not need archiving. They stop validating on their own, because lookups also filter on `expiresAt`.

## Get Entity Schema

```
GET /pwd/tokens/schema
Authorization: Bearer <access_token>
```
