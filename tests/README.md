# Tests

Run from the project root:

```sh
npm test                  # all suites
npm run test:watch        # watch mode
npm run test:coverage     # coverage under tests/coverage/
```

## Suites

### Services / workflows

| File | What it covers |
|------|----------------|
| `workflow-token.test.js` | Unit: HMAC hashing, deep links, policy helpers, challenge kind map, email render / log fallback |
| `token-lifecycle.test.js` | Integration: `createWorkflowToken` → find → consume / bump / invalidate, plus login-challenge mint/resolve (in-memory SQL mock, no Postgres) |
| `pwd-lifecycle.test.js` | Integration: policy, rotate, unlock, auth state, 2FA enable/disable (`pwd.js` + in-memory mock) |
| `trusted-devices.test.js` | Integration: mint / create / verify / list / archive trusted devices |
| `security-questions.test.js` | Integration: catalog, enroll, verify answers (case/whitespace normalize) |
| `workflow-handlers.test.js` | Integration: HTTP paths for recover, unlock, account-recover, 2FA, expired password, trusted devices, security questions (supertest + service mocks); CSRF required on POSTs |

### JSON API routes (Gatelin-style)

| File | What it covers |
|------|----------------|
| `routes/compare.test.js` | `POST /pwd/compare` contract: validation, passken compare, private field strip |
| `routes/gatelin-contract.test.js` | Challenges, trusted-device verify, login-ticket redeem, validators |
| `routes/crud-resources.test.js` | Parameterized wiring for pwd / tokens / policies / trusted-devices (search, history, add, update, archive, schema + mount order) |
| `routes/health.test.js` | Real `app.js`: `/pwd/health` liveness + `/pwd/health/ready` db probe (mocked pg-pool); proves healix is mounted before `startTimer` |

Helpers: `helpers/auth-db-mock.js`, `helpers/token-db-mock.js`, `helpers/json-api-app.js` (JSON mounts mirroring `src/app.js`), `helpers/form.js` (CSRF forms).

## Notes

- Set `PWD_SECRET` (and public URL envs) in each suite so crypto/deep-link/CSRF code can load.
- Handler tests mock token, challenge, pwd, notify orchestration, and security-question services so routes stay fast and DB-free.
- Route tests stub Antity entities / passken — they assert wiring and response contracts, not SQL.
- Form POSTs use `tests/helpers/form.js` (`csrfForm`) for honeypot + timing + signed CSRF cookie/field.
- Workflow CSRF is a signed double-submit cookie (`foxnox_csrf`) plus matching hidden `csrf` field on every HTML POST.
