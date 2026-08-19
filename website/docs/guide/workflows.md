# How Workflows Work

Account workflows are the server-rendered pages Foxnox serves to end users. They exist so that you do not have to build password reset, 2FA enrollment, and device management screens in every frontend you own — and so that the pages handling credentials live in the service that owns them.

They are mounted at `/pwd/web/…` internally, and reached publicly at `/api/pwd/web/…` through the gateway.

## Two Families

Every workflow is driven by a token in the URL, but where that token comes from splits them into two groups that behave quite differently.

**Email-driven workflows** start with a user who cannot sign in. They type an email address, receive a link, and click it. The token arrives as `?token=…`.

| Workflow | Entry point |
|---|---|
| [Password recovery](./workflow-recover) | `/recover` |
| [Account unlock](./workflow-unlock) | `/unlock` |
| [Lost 2FA recovery](./workflow-account-recover) | `/account-recover` |

**Login-step workflows** start mid-sign-in. The password was already accepted, the gateway minted a challenge, and the browser was redirected. The token arrives as `?challenge=…`.

| Workflow | Entry point |
|---|---|
| [Two-factor authentication](./workflow-twofa) | `/2fa/verify` |
| [Expired password](./workflow-password-expired) | `/password/expired` |
| [Trusted devices](./workflow-trusted-devices) | `/trusted-devices/prompt` |

The different query parameter name is not cosmetic: it is how each page knows which token type to validate against, so an email link can never be used to satisfy a login challenge or vice versa.

A third, smaller group is **self-service settings** — pages a signed-in user visits deliberately, with no token at all: [2FA setup](./workflow-twofa#setup), [security questions](./workflow-security-questions), and [device management](./workflow-trusted-devices#manage-devices). These are the only workflow routes registered as `protected`.

## The Email Pipeline

Every email-driven workflow follows the same four steps:

1. **Resolve the address.** The submitted email is sent to `USER_SEARCH_URL` to find a `userId`. Foxnox does not store email addresses.
2. **Create a typed token.** A random plaintext is generated, HMAC-hashed with `PWD_SECRET`, and stored. Only the hash is persisted.
3. **Build the deep link.** `WEB_PUBLIC_ORIGIN` + `WEB_PUBLIC_BASE` + the page path + `?token=<plaintext>`.
4. **Send it.** A Handlebars email template rendered in the user's language and delivered over SMTP.

| Template | Token type | Link target |
|---|---|---|
| `pwd-reset` | Password reset | `/recover/reset?token=…` |
| `account-recover` | Account recovery | `/account-recover/challenge?token=…` |
| `account-unlock` | Account unlock | `/unlock/confirm?token=…` |

When `SMTP_HOST` is unset, step 4 logs the payload instead of sending. That keeps tests offline but means a production deployment missing the variable fails silently.

## No Account Enumeration

Every request form answers with the same confirmation page whether or not the address has an account. "Check your email" does not mean "that address exists" — it means "we are done processing your request".

This is deliberate. A form that behaved differently for known and unknown addresses would be a free tool for discovering who has an account. The cost is that a user who mistypes their address sees the same reassuring page as one who did not, which is worth knowing when reading support tickets.

## Form Protections

Every workflow `POST` passes through three gates before the handler sees it.

**CSRF.** A signed double-submit check: an `HttpOnly` cookie named `foxnox_csrf` plus a matching hidden `csrf` field. Both must be present, identical, and carry a valid signature, or the request is rejected with **403** and no body. Tokens are valid for one hour.

**Honeypot.** Forms carry a decoy `website` field that real users never see. Anything filled in it is treated as automated.

**Timing.** Forms carry the timestamp they were rendered at. A submission arriving in under 1.5 seconds, or more than an hour later, is treated as automated.

Suspicious submissions get **204 No Content** — no error, no explanation, nothing to iterate against.

## Token Rules

Workflow tokens are single-use and short-lived, and both properties are enforced on lookup rather than by a cleanup job:

- **Expiry** — every lookup filters on `expiresAt`, so an expired token stops working the moment it lapses.
- **Single use** — successful completion stamps `verifiedAt`, and verified tokens no longer match.
- **Attempt ceiling** — each failed verification increments `attempts`; passing the type's `maxAttempts` kills the token even before it expires.

When a token fails any of these, the workflow shows its "link is no longer valid" page with a route back to requesting a fresh one. TTLs and attempt limits per type are listed in [Tokens](./api-tokens#how-it-works).

## Localization

Pages and emails ship in English and French. The language is picked per request, in this order:

1. A `lang` value in the query string or form body
2. The `Accept-Language` request header
3. English

Copy lives in `web/locales/en.json` and `fr.json`, keyed by page, so adding a language means adding a file rather than touching handlers.

## Page States

Each workflow is a small set of pages rather than a single form, because there are more outcomes than "worked" and "failed":

| State | Purpose |
|---|---|
| **Request** | The form that starts the flow |
| **Sent** | Non-enumerating confirmation after submitting an email |
| **Action** | The page that does the real work, bound to a valid token |
| **Done** | Success |
| **Invalid** | The token was missing, expired, already used, or over its attempt limit |

Knowing these names is useful when reading logs or the view folder: `web/views/pages/<workflow>/<state>.hbs` maps one-to-one onto the table above.
