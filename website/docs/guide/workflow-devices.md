# Trusted Devices

Asking for a 2FA code on every single sign-in from the user's own laptop is the fastest way to make people turn 2FA off. Trusted devices let a user mark a browser as known so the second factor is skipped there for a limited time.

This workflow has two halves: a **prompt** shown at the end of a successful login, and a **management** page where users review and revoke what they have trusted.

## Pages

| Page | Path | Protected | Purpose |
|---|---|---|---|
| Prompt | `GET/POST /trusted-devices/prompt?challenge=…` | ⬜ | "Remember this device?" after a 2FA check |
| Done | after accepting | ⬜ | Device trusted |
| Skipped | after declining | ⬜ | Continuing without trust |
| Manage | `GET /trusted-devices` | ✅ | List trusted devices |
| Revoked | after revoking | ✅ | Trust removed |
| Invalid | on bad challenge | ⬜ | Challenge missing, expired, or already used |

## The Prompt

Reached by redirect from a successful [2FA verification](./workflow-twofa), carrying a fresh `trusted-device` challenge. It is the last step of the login chain, which makes it the page that issues the login resume ticket — whichever way the user answers.

```mermaid
sequenceDiagram
    participant B as Browser
    participant F as Foxnox
    participant G as BFF

    B->>F: POST /2fa/verify (code accepted)
    F-->>B: 303 to /trusted-devices/prompt?challenge=…
    B->>F: GET the prompt
    F-->>B: "Trust this device?" + optional device name

    alt user accepts
        B->>F: POST { trust: "yes", deviceName }
        F->>F: mint token, store hash + IP + user agent
        F-->>B: Set-Cookie trusted_device; 303 to resume URL
    else user declines
        B->>F: POST { trust: "no" }
        F-->>B: 303 to resume URL
    end

    B->>G: POST /gatelin/sessions/resume { ticket }
    G-->>B: 200 session
```

Declining is not a failure path. The challenge is consumed either way and the user lands on the resume URL with a valid ticket — the only difference is whether a cookie and a row were created.

The optional device name is there because "Chrome on macOS" tells a user very little six months later, when they are trying to work out which of four entries is the laptop they sold.

## What Gets Stored

Accepting creates a `user_trusted_device` row with a hash of the cookie value, the device name, the IP address, the user agent, and an expiry **90 days** out. The cookie itself is `HttpOnly`, `SameSite=Lax`, and scoped to `Path=/`.

That path scope matters: the cookie has to reach the BFF's login endpoint, not just the Foxnox workflow pages, or it could never be checked during a sign-in. Set `COOKIE_SECURE=1` to add the `Secure` flag when serving over HTTPS.

Only the hash is stored, so the table cannot be read back into working cookies.

## How the Skip Works

On the next login, the BFF forwards the `trusted_device` cookie to Foxnox's [verify endpoint](./api-devices#verify-a-device-token). A live matching row means the 2FA challenge is never minted, and `lastUsedAt` is refreshed.

The check is against the database rather than the cookie alone, which is what makes revocation immediate — there is no need to reach the browser and delete anything.

## Manage Devices

A signed-in user can list their devices with the name, last-used date, and expiry, and revoke any of them. Revoking archives the row, so the next sign-in from that browser asks for a code again even though the cookie is still sitting there.

This is the page to point someone at when they lose a laptop.

```
/api/foxnox/web/trusted-devices
```

## Expiry

Trust lapses on its own after 90 days, because verification filters on `expiresAt`. No job is needed to clean up — an expired row simply stops matching. Archived rows are deleted for good by the nightly job two months later.

To cut a device's trust short without revoking it, shorten `expiresAt` through the [admin API](./api-devices#update-trusted-devices).
