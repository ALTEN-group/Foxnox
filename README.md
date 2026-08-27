# Foxnox

[![Coverage](https://raw.githubusercontent.com/ALTEN-group/Foxnox/badges/badges/coverage.svg)](https://github.com/ALTEN-group/Foxnox/actions/workflows/test.yml)
[![admin coverage](https://raw.githubusercontent.com/ALTEN-group/Foxnox/badges/badges/admin-coverage.svg)](https://github.com/ALTEN-group/Foxnox/actions/workflows/test.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version](https://img.shields.io/github/v/release/ALTEN-group/Foxnox)](https://github.com/ALTEN-group/Foxnox/releases/latest)
[![Last release](https://img.shields.io/github/release-date/ALTEN-group/Foxnox)](https://github.com/ALTEN-group/Foxnox/releases/latest)

Password and account-security service: credential storage, 2FA, recovery tokens, and trusted devices, plus server-rendered account workflow pages. Foxnox is an internal password store: put a Backend for Frontend in front of it as the public API layer. [Gatelin](https://gatelin.fr) is one such BFF, not a requirement.

## Images

| Image | Registry |
|---|---|
| API (includes workflow pages and Admin UI) | `ghcr.io/alten-group/foxnox` |
| Migration | `ghcr.io/alten-group/foxnox-migration` |

## Features

- **Credentials** — Password hashes, rotation dates, expiry, and lockout state kept out of other services
- **Authentication factors** — TOTP 2FA enrollment and mid-login verification
- **Tokens** — Short-lived typed tokens for reset, unlock, recovery, and login challenges (HMAC only at rest)
- **Trusted devices** — Remember a browser for a limited time so 2FA is not prompted on every sign-in
- **Security questions** — Recover an account when the authenticator is lost
- **Policies** — Length and character rules used to generate and validate passwords
- **Account workflows** — Server-rendered recovery, unlock, 2FA, and device pages (EN/FR), white-label ready
- **Admin UI** — Angular front-end to manage passwords, policies, tokens, and devices

## Documentation

Full documentation is available at **[https://alten-group.github.io/Foxnox](https://alten-group.github.io/Foxnox)**.

## Quick Start for off the shelf usage

Integrate Foxnox into your application using published Docker images : 
- [Integration Guide](https://alten-group.github.io/Foxnox/guide/integration)
- [Frontend Integration Guide](https://alten-group.github.io/Foxnox/guide/frontend)

## Quick Start for contributors

```bash
# 1. Clone the repository
git clone https://github.com/ALTEN-group/Foxnox.git
cd Foxnox

# 2. Generate the development environment file
bash scripts/setup-env.sh

# 3. Start the stack
bash scripts/start-dev.sh
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development workflow, testing, and production build instructions.

## License

MIT — see [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md). Published and maintained by ALTEN.
