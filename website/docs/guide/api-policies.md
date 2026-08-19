# Policies

A password policy describes what a valid password looks like. Exactly one policy is `active` at a time, and it is used for two things: generating passwords server-side when you create a `pwd` row, and validating the ones users choose in the recovery and expired-password workflows.

Keeping these rules in the database rather than in code means you can tighten your password requirements without redeploying anything.

## How It Works

The policy is read at the moment a password is created or changed, not at boot. Making a new policy active therefore takes effect on the next password change — existing passwords are unaffected until their owners rotate them.

`expiryDays` is the one field that reaches backwards: it is used to compute the `pwdExpiry` stamped on a `pwd` row when the password is set. Set it to `0` to disable expiry entirely.

## Search Policies

```
POST /pwd/policies/search
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "filters": {
    "active": { "value": true, "matchMode": "=" }
  }
}
```

**Response (200 OK):**

```json
{
  "rows": [
    {
      "id": 1,
      "name": "default",
      "description": "Default password policy",
      "length": 12,
      "number": true,
      "symbol": true,
      "lowerCase": true,
      "upperCase": true,
      "strict": true,
      "symbols": "!@#$%^&*",
      "expiryDays": 90,
      "active": true,
      "archived": false
    }
  ]
}
```

## Get Policy History

```
GET /pwd/policies/:id/history
Authorization: Bearer <access_token>
```

## Create Policies

```
POST /pwd/policies/
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
      "active": false
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
| `symbols` | 0–50 chars | The set of symbols considered valid |
| `expiryDays` | ≥ 0 | Days until a new password expires; `0` disables expiry |
| `active` | boolean | Whether this is the policy in force |

## Update Policies

```
PUT /pwd/policies/
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    {
      "id": 2,
      "name": "strict-2026",
      "length": 16,
      "number": true,
      "symbol": true,
      "lowerCase": true,
      "upperCase": true,
      "strict": true,
      "symbols": "!@#$%^&*()-_=+",
      "expiryDays": 60,
      "active": true
    }
  ]
}
```

**Response (200 OK):** the updated rows.

Activating a policy is an update that sets `active` to `true`. Because only one policy should be in force, deactivate the previous one in the same operation.

Most fields are required on `PUT` — send the whole policy rather than a partial patch.

## Archive Policies

```
POST /pwd/policies/archive
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    { "id": 2 }
  ]
}
```

**Response (204 No Content).** Do not archive the active policy — password generation and validation need one to read.

## Get Entity Schema

```
GET /pwd/policies/schema
Authorization: Bearer <access_token>
```
