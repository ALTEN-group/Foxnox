# Data Model

Foxnox owns its own PostgreSQL database (`foxnox` by default). Users live elsewhere — every table refers to them by a plain `userId` with no foreign key, because the user table is in another service's database.

## Credentials, Tokens & Devices

```mermaid
erDiagram
  pwd }o--|| user : "(external)"
  token_type ||--o{ token : ""
  token }o--|| user : "(external)"
  user_trusted_device }o--|| user : "(external)"

  pwd {
    int id PK
    int userId FK "external"
    varchar pwdHash
    timestamp pwdUpdatedAt
    timestamp pwdExpiry
    int failedAttempts
    timestamp lockedUntil
    timestamp lastLoginAt
    boolean twoFactorEnabled
    varchar twoFactorSecret
    boolean archived
    timestamp archivedAt
  }

  pwd_policy {
    int id PK
    varchar name
    varchar description
    int length
    boolean number
    boolean symbol
    boolean lowerCase
    boolean upperCase
    boolean strict
    varchar symbols
    int expiryDays
    boolean active
    boolean archived
    timestamp archivedAt
  }

  token_type {
    int id PK
    varchar name
    text description
    int ttl
    int maxAttempts
    boolean archived
    timestamp archivedAt
  }

  token {
    int id PK
    varchar hash UK
    int typeId FK
    int userId FK "external"
    int attempts
    timestamp expiresAt
    timestamp verifiedAt
    boolean archived
    timestamp archivedAt
  }

  user_trusted_device {
    int id PK
    int userId FK "external"
    varchar deviceTokenHash UK
    varchar deviceName
    varchar ipAddress
    text userAgent
    timestamp expiresAt
    timestamp lastUsedAt
    boolean archived
    timestamp archivedAt
  }

  user {
  }
```

### pwd

One row per user, and the single source of truth for whether a sign-in can proceed. Everything the gateway needs — hash, expiry, lockout state, 2FA flag — is in this row, which is why a login needs exactly one call to Foxnox.

`pwdHash` and `twoFactorSecret` are marked private: readable internally, never serialized into a response.

### pwd_policy

Password rules as data. Exactly one row is `active`, and it is read at the moment a password is created or changed rather than at boot — so activating a new policy takes effect on the next password change without a restart.

### token_type

Reference data seeded by the migration, holding the `ttl` (minutes) and `maxAttempts` for each kind of token. Putting these limits in a table is what lets "reset links last 30 minutes, 2FA challenges last 10" be configuration rather than code. See [Tokens](./api-tokens#how-it-works) for the seeded set.

### token

One row per outstanding link or challenge. `hash` is unique and is an HMAC of the plaintext — the plaintext itself exists only in the URL that was sent, so this table cannot be read back into working links.

Three columns make tokens single-use and bounded: `expiresAt` filters every lookup, `verifiedAt` marks consumption, and `attempts` counts failures against the type's ceiling.

### user_trusted_device

One row per remembered browser. `deviceTokenHash` is the HMAC of the cookie value and is unique. The device name, IP address, and user agent exist so the management page can show a user something recognisable.

## Security Questions

```mermaid
erDiagram
  security_question_category ||--o{ security_question_category_trans : ""
  security_question_category ||--o{ security_question : ""
  security_question ||--o{ security_question_trans : ""
  security_question ||--o{ user_security_answer : ""
  user_security_answer }o--|| user : "(external)"

  security_question_category {
    int id PK
    varchar name UK
    boolean archived
    timestamp archivedAt
  }

  security_question_category_trans {
    int categoryId PK, FK
    varchar lang PK
    varchar trans
  }

  security_question {
    int id PK
    varchar question
    int categoryId FK
    boolean active
    boolean archived
    timestamp archivedAt
  }

  security_question_trans {
    int questionId PK, FK
    varchar lang PK
    varchar trans
  }

  user_security_answer {
    int id PK
    int userId FK "external"
    int questionId FK
    varchar answerHash
    boolean archived
    timestamp archivedAt
  }

  user {
  }
```

The `_trans` tables hold one row per language for each question and category. Splitting text from identity is what lets a question be displayed in French while keeping a stable numeric ID — so an answer enrolled in one language still matches when the user recovers in another.

`user_security_answer` stores only `answerHash`. Answers cannot be read back, which means a user who forgets them can only re-enroll.

## Conventions

Every table follows the same three patterns, which is worth knowing because it explains behaviour you will see across the whole API.

**Soft deletion.** Nothing is deleted by the application. `archived` and `archivedAt` flag a row, and it immediately stops matching queries — which is why revoking a device or a token takes effect at once. The nightly job hard-deletes archived rows after two months.

**Audit columns.** Every table carries `createdAt`, `creatorName`, `updatedAt`, and `updaterName`. Rows written by the service itself rather than by a user are stamped with `creatorId = -1` and the name `system`.

**History triggers.** Database triggers record every change into `log.history`, exposed per row through the `GET /:id/history` endpoints. History older than six months is purged nightly.

## Migrations

The schema is managed by Liquibase in `db/liquibase/pwd/`, applied by the `dwtechs/foxnox-migration` container. Changesets are grouped by purpose — structure, triggers, and seed data — and the migration also creates the database and the application user on a fresh install. See [Deployment](./deployment#database-migration).

There is also a `pwd_policies` **view** that adds a computed `expiryDate`, so callers can read when a password expires without recalculating it from `expiryDays`.
