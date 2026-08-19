# Trusted Devices

A trusted device is a browser the user chose to remember so that 2FA is not demanded on every sign-in. This page covers the administrative API; the user-facing side is described in [Trusted Devices workflow](./workflow-trusted-devices).

## How It Works

Trusting a device is a cookie plus a row, tied together by a hash:

1. After a successful 2FA check, the user is offered a "remember this device" prompt.
2. If they accept, Foxnox generates a random value, sets it as the `trusted_device` cookie, and stores an HMAC hash of it in `user_trusted_device` — alongside the device name, IP address, user agent, and an expiry date 90 days out.
3. On the next login, the gateway forwards the cookie to Foxnox, which hashes it and looks for a live matching row.
4. A match means the 2FA challenge is skipped, and `lastUsedAt` is refreshed.

As with tokens, only the hash is stored, so the table cannot be turned into a set of working cookies. A row stops counting as trusted the moment it is archived or its `expiresAt` passes — no cookie invalidation is needed, which is what makes revocation instant.

## Verify a Device Token

Called by the gateway during login, not by clients.

```
POST /pwd/trusted-devices/verify
Content-Type: application/json

{
  "userId": 1,
  "deviceToken": "<value of the trusted_device cookie>"
}
```

**Response (200 OK):**

```json
{ "trusted": true }
```

**Response (400 Bad Request):** `userId` is not a positive integer, or `deviceToken` is empty.

The response is always a plain boolean — an unknown, revoked, or expired token is simply `false`, with no distinction between them.

## Search Trusted Devices

```
POST /pwd/trusted-devices/search
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "filters": {
    "userId": { "value": 1, "matchMode": "=" }
  }
}
```

**Response (200 OK):**

```json
{
  "rows": [
    {
      "id": 4,
      "userId": 1,
      "deviceName": "Chrome on macOS",
      "ipAddress": "203.0.113.24",
      "userAgent": "Mozilla/5.0 …",
      "expiresAt": "2026-11-17T09:00:00.000Z",
      "lastUsedAt": "2026-08-19T08:12:00.000Z",
      "archived": false
    }
  ]
}
```

`deviceTokenHash` is private and never returned.

## Get Device History

```
GET /pwd/trusted-devices/:id/history
Authorization: Bearer <access_token>
```

## Create Trusted Devices

Normally created by the workflow prompt rather than by hand, since only the workflow can set the matching browser cookie.

```
POST /pwd/trusted-devices/
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    {
      "userId": 1,
      "deviceTokenHash": "<hmac of the cookie value>",
      "deviceName": "Chrome on macOS",
      "ipAddress": "203.0.113.24",
      "userAgent": "Mozilla/5.0 …",
      "expiresAt": "2026-11-17T09:00:00.000Z"
    }
  ]
}
```

### Device fields

| Field | Required | Description |
|---|---|---|
| `userId` | ✅ | Owner of the device |
| `deviceTokenHash` | ✅ | HMAC of the cookie value; write-only |
| `expiresAt` | ✅ | When the trust lapses; the workflow defaults to 90 days |
| `deviceName` | ⬜ | Label shown to the user, up to 100 chars |
| `ipAddress` | ⬜ | Address the device was trusted from, up to 45 chars |
| `userAgent` | ⬜ | Browser user agent string |
| `lastUsedAt` | ⬜ | Refreshed on every successful verification |

## Update Trusted Devices

```
PUT /pwd/trusted-devices/
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    { "id": 4, "expiresAt": "2026-09-17T09:00:00.000Z" }
  ]
}
```

**Response (200 OK):** the updated rows. Only `expiresAt` and `lastUsedAt` are writable — shortening `expiresAt` is how you cut a device's trust short without revoking it outright.

## Archive Trusted Devices

```
POST /pwd/trusted-devices/archive
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    { "id": 4 }
  ]
}
```

**Response (204 No Content):** this is device revocation. The next login from that browser will be asked for 2FA again, because verification filters out archived rows.

## Get Entity Schema

```
GET /pwd/trusted-devices/schema
Authorization: Bearer <access_token>
```
