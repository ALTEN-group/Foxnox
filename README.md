# Foxnox

[![Coverage](https://raw.githubusercontent.com/DWTechs/Foxnox/badges/badges/coverage.svg)](https://github.com/DWTechs/Foxnox/actions/workflows/test.yml)
[![admin coverage](https://raw.githubusercontent.com/DWTechs/Foxnox/badges/badges/admin-coverage.svg)](https://github.com/DWTechs/Foxnox/actions/workflows/test.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version](https://img.shields.io/github/v/release/DWTechs/Foxnox)](https://github.com/DWTechs/Foxnox/releases/latest)
[![Last release](https://img.shields.io/github/release-date/DWTechs/Foxnox)](https://github.com/DWTechs/Foxnox/releases/latest)

Password and account-security service: credential storage, 2FA, recovery tokens, and trusted devices, plus server-rendered account workflow pages. Sit Foxnox behind Gatelin — that BFF is the public API layer; Foxnox is the internal password store.

## Images

| Image | Registry |
|---|---|
| API (includes workflow pages under `/pwd/web`) | `ghcr.io/dwtechs/foxnox` |
| Migration | `ghcr.io/dwtechs/foxnox-migration` |

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

Full documentation is available at **[https://dwtechs.github.io/Foxnox](https://dwtechs.github.io/Foxnox)**.

## Quick Start for off the shelf usage

Integrate Foxnox into your application using published Docker images : 
- [Integration Guide](https://dwtechs.github.io/Foxnox/guide/integration)
- [Frontend Integration Guide](https://dwtechs.github.io/Foxnox/guide/frontend)

## Quick Start for contributors

```bash
# 1. Clone the repository
git clone https://github.com/DWTechs/Foxnox.git
cd Foxnox

# 2. Generate the development environment file
bash scripts/setup-env.sh

# 3. Start the stack
bash scripts/start-dev.sh
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development workflow, testing, and production build instructions.
