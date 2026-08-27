# Overview

Foxnox is the password and account-security service for a microservices architecture. It owns everything a user needs to sign in safely, so that no other service has to store a password hash:

- 🔑 **Credential storage** — Password hashes, rotation dates, and expiry dates
- 🔒 **Lockout handling** — Failed attempt counters and time-based account locks
- 🔐 **Two-factor authentication** — TOTP enrollment and mid-login verification
- 🎫 **Typed tokens** — Short-lived tokens for reset links, unlock links, and login challenges
- ❓ **Security questions** — Answers used to recover an account when 2FA is lost
- 📱 **Trusted devices** — Remembered browsers that skip the 2FA prompt for a while
- 📄 **Password policies** — Length and character rules used to generate and validate passwords
- 🖥️ **Account workflow pages** — Server-rendered recovery, unlock, 2FA, and device pages in English and French
- 📧 **Email delivery** — Reset and unlock links sent over SMTP from Handlebars templates
- 🎛️ **Front-end admin** — Manage passwords, policies, tokens, and devices through a web interface
- 🛡️ **BFF ACL enforcement** — Enforce field allow-lists and row conditions forwarded by the BFF on JSON reads and writes

## What Foxnox Is Not

Foxnox deliberately stops at credentials and authentication factors. **User profiles** — names, email addresses, email verification, contact details — belong to your user management service. Foxnox only ever refers to a user by a numeric `userId`, and resolves an email address to that ID by calling out to user management (see [`USER_SEARCH_URL`](./configuration)).

Foxnox also does not issue sessions. It answers the question "is this password correct, and is anything blocking this sign-in?". A **Backend for Frontend** turns that answer into a session. [Gatelin](https://gatelin.fr) is the reference BFF used in these docs and in the Compose examples; any BFF that speaks the same HTTP contract works.

## Two Surfaces

Foxnox exposes two very different kinds of endpoint, and it helps to keep them apart:

| Surface | Mount | Consumer | Format |
|---|---|---|---|
| **JSON API** | `/foxnox/…` | Your BFF and the admin UI | JSON request/response |
| **Account workflows** | `/foxnox/web/…` | End users, in a browser | Server-rendered HTML |

Both are reached through the BFF, which typically adds a public `/api` prefix — so the public URLs are `/api/foxnox/…` and `/api/foxnox/web/…`. See [Request Flow](./architecture).

## Key Concepts

### The pwd row

Every user with a password has exactly one **`pwd` row**. It is the heart of the service and carries the hash plus all the state that can block a sign-in:

- `pwdHash` — the stored hash, never returned by the API
- `pwdUpdatedAt` / `pwdExpiry` — when the password was last rotated, and when it must be rotated again
- `failedAttempts` / `lockedUntil` — lockout state after repeated bad passwords
- `twoFactorEnabled` / `twoFactorSecret` — 2FA state; the secret is never returned by the API

Because a single row answers "can this user log in right now?", the BFF only needs one call to Foxnox to find out. See [Passwords](./api-passwords).

The row also has an optional `lastLoginAt` metadata field, but Foxnox does not
update it during password comparison. A BFF or administrator must write it
explicitly if the deployment uses it.

### Tokens

A **token** is a single-use, time-limited secret tied to a user and a **token type**. The plaintext exists only in the URL sent to the user; Foxnox stores an HMAC hash of it, so a database leak cannot be replayed as a valid link.

Each token type carries its own time-to-live and maximum attempt count, which is how "a password reset link lasts 30 minutes but a 2FA challenge lasts 10" is expressed as data rather than code. See [Tokens](./api-tokens).

### Login challenges

A **login challenge** is a token that represents an unfinished sign-in. When the password is correct but something else stands in the way — 2FA is enabled, or the password has expired — the BFF does not issue a session. Instead it asks Foxnox to mint a challenge, and answers the login request with **HTTP 202** and a URL pointing at the matching workflow page.

The user completes the step in the browser; Foxnox then hands back a one-shot **login resume ticket** which the frontend redeems to finally get its session. See [Login Challenges](./api-challenges).

### Account workflows

An **account workflow** is a small sequence of server-rendered pages that walks a user through one security task: recovering a forgotten password, unlocking a locked account, enrolling an authenticator app, answering security questions, or reviewing remembered devices.

They ship with the service, so you do not have to build reset and 2FA screens in every frontend you own. They are localized in English and French, and their colors, logo, and product name are configurable per deployment. See [How Workflows Work](./workflows) and [Branding](./branding).

### Trusted devices

A **trusted device** is a browser the user chose to remember. Foxnox stores a hash of a random cookie value along with the device name, IP address, user agent, and an expiry date — 90 days by default. While that cookie is valid, the BFF skips the 2FA challenge for that user on that browser. Users can list and revoke their devices themselves. See [Trusted Devices](./api-devices).

### Password policies

A **password policy** describes what a valid password looks like: minimum length, whether digits, symbols, lower case, and upper case are required, which symbol set to allow, after how many days a password expires, and when lockout kicks in after failed sign-ins. Foxnox uses the first non-archived policy (lowest `id`) both to generate passwords server-side and to validate the ones users choose. See [Policies](./api-policies).
