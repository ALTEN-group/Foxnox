# Policies

A password policy describes what a valid password looks like, and how lockout behaves after failed sign-ins. Foxnox uses the **first non-archived** `pwd_policy` row (lowest `id`) for two things: generating passwords server-side when you create a `pwd` row, and validating the ones users choose in the recovery and expired-password workflows.

Keeping these rules in the database rather than in code means you can tighten requirements without redeploying, but see [How It Works](#how-it-works) for what takes effect immediately versus what needs a restart.

## How It Works

There is no `active` flag. The migration seeds three policies (`Public User`, `High Security`, `Standard`); the in-force one is whichever non-archived row comes first by `id`. Archive the others if you want a later row to take effect.

Character-class and expiry rules for **user-chosen** passwords are read at the moment a password is rotated, not at boot. **Generated** passwords (`POST /foxnox/`) follow the policy that was loaded during `initPwdGeneration` at process start — restart Foxnox after changing generation rules.

`expiryDays` is used to compute the `pwdExpiry` stamped on a `pwd` row when the password is set. Set it to `0` to disable expiry entirely.

`maxFailedAttempts` and `lockoutMinutes` are applied on each failed `POST /foxnox/compare`. Defaults when a policy omits them (or no policy exists) are **5** attempts and **15** minutes.

Passken generates passwords between **12** and **64** characters. A policy `length` below 12 is still enforced when users choose a password, but generated passwords are clamped up to 12.

The custom `symbols` pool is used when validating user-chosen passwords. The generator draws from Passken's built-in symbol list and does not take that pool as an argument.

## Search Policies

```
POST /foxnox/policies/search
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "filters": {
    "archived": { "value": false, "matchMode": "=" }
  }
}
```

**Response (200 OK):**

```json
{
  "rows": [
    {
      "id": 1,
      "name": "Public User",
      "description": "Default password policy for regular users",
      "length": 10,
      "number": true,
      "symbol": true,
      "lowerCase": true,
      "upperCase": true,
      "strict": true,
      "symbols": "!@#%*_-+=:?><./()",
      "expiryDays": 0,
      "maxFailedAttempts": 5,
      "lockoutMinutes": 15,
      "archived": false
    }
  ]
}
```

## Get Policy History

```
GET /foxnox/policies/:id/history
Authorization: Bearer <access_token>
```

## Create Policies

```
POST /foxnox/policies/
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    {
      "name": "strict-2026",
      "description": "Tightened requirements",
      "length": 16,
      "number": true,
      "symbol": true,
      "lowerCase": true,
      "upperCase": true,
      "strict": true,
      "symbols": "!@#$%^&*()-_=+",
      "expiryDays": 60,
      "maxFailedAttempts": 5,
      "lockoutMinutes": 15
    }
  ]
}
```

### Policy fields

| Field | Range | Description |
|---|---|---|
| `name` | 1–50 chars | Policy identifier |
| `description` | 0–100 chars | Human-readable note |
| `length` | 6–64 | Minimum password length |
| `number` | boolean | Require at least one digit |
| `symbol` | boolean | Require at least one symbol |
| `lowerCase` | boolean | Require at least one lower-case letter |
| `upperCase` | boolean | Require at least one upper-case letter |
| `strict` | boolean | When true, every enabled character class must be present. When false, the classes act as a pool to draw from rather than a checklist. |
| `symbols` | 0–50 chars | The set of symbols considered valid for user-chosen passwords |
| `expiryDays` | ≥ 0 | Days until a new password expires; `0` disables expiry |
| `maxFailedAttempts` | ≥ 1 | Failed `POST /foxnox/compare` attempts before `lockedUntil` is set |
| `lockoutMinutes` | ≥ 0 | How long that lock lasts |

At least one of `number`, `symbol`, `lowerCase`, or `upperCase` must be true (enforced by a database check).

A newly inserted row only becomes the in-force policy if every lower-`id` policy is archived, because lookup is "first non-archived by `id`".

## Update Policies

```
PUT /foxnox/policies/
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    {
      "id": 1,
      "name": "Public User",
      "length": 16,
      "number": true,
      "symbol": true,
      "lowerCase": true,
      "upperCase": true,
      "strict": true,
      "symbols": "!@#$%^&*()-_=+",
      "expiryDays": 60,
      "maxFailedAttempts": 5,
      "lockoutMinutes": 15
    }
  ]
}
```

**Response (200 OK):** the updated rows.

Most fields are required on `PUT` — send the whole policy rather than a partial patch.

## Archive Policies

```
POST /foxnox/policies/archive
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    { "id": 2 }
  ]
}
```

**Response (204 No Content).** Do not archive every policy — password generation and validation need one non-archived row to read. Archiving the lowest-`id` row is how you switch to the next remaining policy.

## Get Entity Schema

```
GET /foxnox/policies/schema
Authorization: Bearer <access_token>
```
