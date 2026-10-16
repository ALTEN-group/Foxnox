# Try Workflows Locally

How to open and walk through the [account workflow](./workflows) pages in the local Docker stack.

## Start the Stack

```bash
./scripts/start-dev.sh
```

This starts every service, including **Mailpit** (the local mail catcher) and Foxnox. The `web/` folder is bind-mounted into the Foxnox container, so edits to templates, locales, and CSS show up on the next page load.

| What | URL |
|---|---|
| Workflow pages | `http://localhost:8100/api/foxnox/web/<path>` |
| Mailpit inbox | `http://localhost:8025` |

The workflow base comes from `WEB_PUBLIC_BASE` in `docker/conf/.env.dev`. Mailpit's UI port is published directly by Docker (`MAILPIT_UI_PORT`), not through Traefik. Its SMTP port `1025` is only reachable inside the Docker network. On a remote host or dev container, forward ports `8100` and `8025`.

## Email-Driven Pages

The request pages need no token and can be opened directly.

| Workflow | Request page |
|---|---|
| [Password recovery](./workflow-recover) | `/recover` |
| [Account unlock](./workflow-unlock) | `/unlock` |
| [Lost 2FA recovery](./workflow-account-recover) | `/account-recover` |

To reach the page behind the link:

1. Open the request page and submit the email of an existing user.
2. Open Mailpit at `http://localhost:8025` and open the message.
3. Click the link (`…/recover/reset?token=…`, `…/unlock/confirm?token=…`, or `…/account-recover/challenge?token=…`).

The user lookup goes through `USER_SEARCH_URL`; in the dev stack that is the `ms_user` mock. An unknown address shows the same "check your email" page but sends nothing (see [No Account Enumeration](./workflows#no-account-enumeration)).

::: tip
Submitting in under 1.5 seconds after the page rendered is treated as a bot and answered with `204`. Wait a moment before clicking Submit.
:::

## Login-Step Pages

`/2fa/verify`, `/password/expired`, and `/trusted-devices/prompt` need a `?challenge=…` that is minted by the BFF after a successful password check. They cannot be opened with a hand-written URL; reach them by signing in with a user whose account triggers the step (2FA enabled, or an expired password). See [Login Challenges](./api-challenges) for the flow.

## Self-Service Pages

`/2fa/setup`, `/security-questions`, and `/trusted-devices` take no token but are registered as `protected`, so the request must carry a valid session through the BFF. Sign in first, then open them from the same browser.

## Without a Link

Pages that need a token fail with the "link is no longer valid" page. A missing page or blank CSS usually means the stack is not up or the base path is wrong; see [Troubleshooting](./troubleshooting).
