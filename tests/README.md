# Tests

Run from the project root:

```sh
npm test                  # all suites
npm run test:watch        # watch mode
npm run test:coverage     # coverage under tests/coverage/
```

## Suites

| File | What it covers |
|------|----------------|
| `workflow-token.test.js` | Unit: HMAC hashing, deep links, policy helpers, challenge kind map, email render / log fallback |
| `token-lifecycle.test.js` | Integration: `createWorkflowToken` → find → consume / bump / invalidate, plus login-challenge mint/resolve (in-memory SQL mock, no Postgres) |
| `workflow-handlers.test.js` | Integration: HTTP paths for recover, unlock, account-recover, 2FA, expired password, trusted devices, security questions (supertest + service mocks); CSRF required on POSTs |

## Notes

- Set `PWD_SECRET` (and public URL envs) in each suite so crypto/deep-link/CSRF code can load.
- Handler tests mock token, challenge, pwd, notify orchestration, and security-question services so routes stay fast and DB-free.
- Form POSTs use `tests/helpers/form.js` (`csrfForm`) for honeypot + timing + signed CSRF cookie/field.
- Workflow CSRF is a signed double-submit cookie (`foxnox_csrf`) plus matching hidden `csrf` field on every HTML POST.
