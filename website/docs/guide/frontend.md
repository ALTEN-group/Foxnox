# Frontend Integration

Most of Foxnox needs nothing from your frontend — the workflow pages are served by Foxnox itself. There is one exception, and it is the one that breaks logins if you skip it: **handling the 202 challenge response**.

## The One Thing You Must Handle

A login can return **202 Accepted**. The password was correct, but a mid-login step is required before a session exists. Code that treats any non-200 as a failure will leave every 2FA user unable to sign in.

The example uses Gatelin's session endpoint; a custom BFF should return the same **202** body with a `url`.

```typescript
const response = await fetch('/api/gatelin/sessions', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, pwd })
});

if (response.status === 202) {
  // Password OK, but a challenge is required (2FA / expired password).
  const { url } = await response.json();
  window.location.assign(url);
  return;
}

if (!response.ok) {
  // 401 wrong password, 403 locked (Foxnox refused compare while lockedUntil is in the future), 404 unknown user
  throw new Error('Login failed');
}

const { accessToken, refreshToken } = await response.json();
```

`credentials: 'include'` matters here: it is what sends the `trusted_device` cookie, and without it every login from a remembered browser is challenged again.

## Resuming After a Challenge

Once the user has completed the workflow pages, Foxnox redirects the browser to `WEB_LOGIN_RESUME_URL` with `?ticket=…`. Your login page has to notice that parameter and redeem it before rendering a form:

```typescript
const ticket = new URLSearchParams(window.location.search).get('ticket');

if (ticket) {
  const response = await fetch('/api/gatelin/sessions/resume', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket })
  });

  if (!response.ok) throw new Error('Resume failed');

  const { accessToken, refreshToken } = await response.json();

  // Drop ?ticket= from the URL so a reload cannot retry a spent ticket
  history.replaceState({}, '', window.location.pathname);
  return;
}
```

Tickets are valid for 10 minutes and can be redeemed exactly **once**. Clearing the query string is not cosmetic — a reload would otherwise post a spent ticket and fail.

## Handling 403 Lockout

A **403** means the account is locked after repeated failures. Users have no way to guess what to do next, so show the unlock workflow:

```typescript
if (response.status === 403) {
  showMessage('Account temporarily locked.');
  showLink('Request an unlock', '/api/foxnox/web/unlock');
  return;
}
```

## Links to the Workflow Pages

These are plain links — full page navigations to Foxnox, not fetch calls:

| Where | Link |
|---|---|
| Login page | `/api/foxnox/web/recover` — forgotten password |
| Login page | `/api/foxnox/web/unlock` — locked account |
| Account settings | `/api/foxnox/web/2fa/setup` — enable 2FA |
| Account settings | `/api/foxnox/web/security-questions` — enroll recovery questions |
| Account settings | `/api/foxnox/web/trusted-devices` — review remembered devices |

Do not try to fetch these and render the HTML yourself. They set cookies, enforce CSRF, and redirect between states; they only work as real navigations.

Pass `?lang=fr` to force a language, otherwise the `Accept-Language` header decides.

## Cookies

Foxnox sets two cookies, and both are `HttpOnly` — your JavaScript cannot and does not need to read them.

| Cookie | Path | Purpose |
|---|---|---|
| `trusted_device` | `/` | Lets the BFF skip 2FA on a remembered browser. Scoped to the root so it reaches the login endpoint, not just the workflow pages. |
| `foxnox_csrf` | `/foxnox/web` | Double-submit CSRF protection for workflow forms. Handled entirely by the pages. |

Both gain the `Secure` flag when `COOKIE_SECURE=1` or `NODE_ENV=production`.

## Calling the Admin API

The CRUD endpoints are ordinary authenticated JSON calls through the BFF:

```typescript
const response = await fetch('/api/foxnox/search', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    pagination: true,
    first: 0,
    limit: 10,
    filters: { userId: { value: 1, matchMode: '=' } }
  })
});
```

Every route is restricted to the Super admin and Admin roles, so these are admin-tool calls rather than something to expose to end users.

If you are building admin screens, `GET /api/foxnox/schema` returns the field definitions — types, limits, and which operations each field participates in — which lets forms stay in sync with the backend instead of duplicating its rules.

## What Not to Build

It is worth being explicit about the screens you should *not* write, because Foxnox already owns them and building parallel versions means duplicating password policy and token validation:

- Password reset forms
- 2FA code entry and QR enrollment
- Security question enrollment
- Trusted device lists
- Forced password change on expiry

Link to the workflow pages instead. The one piece of login logic that genuinely belongs in your frontend is the 202-and-ticket handling above.
