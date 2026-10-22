#!/bin/bash
set -euo pipefail

# Run the Playwright suite for the public web workflows (web/e2e) in a dedicated
# container against the running dev stack. Requires `scripts/start-dev.sh`.
#
# State of the dedicated e2e accounts (userId 6-9, see web/e2e/helpers/users.ts and
# mocks/ms_user) is wiped first: password rows, tokens, trusted devices and security
# answers. The suite rebuilds what it needs through the real workflows. Always run
# through this script so that reset happens.
#
# Usage:
#   scripts/e2e-web.sh                       # full suite
#   scripts/e2e-web.sh --grep "unlock"       # forwards flags to `playwright test`
#
# Gatelin rate-limits /sessions to 20 per 15 min and a full run spends most of it, so
# this script restarts the gatelin container first to give every run a full budget.

ENV_FILE="docker/conf/.env.dev"
COMPOSE_FILE="docker/docker-compose.yml"
E2E_USER_IDS="6,7,8,9"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found. Run scripts/setup-env.sh first." >&2
  exit 1
fi

ENV_TMP=$(mktemp)
grep -v '^#' "$ENV_FILE" | grep -v '^UID=' > "$ENV_TMP"
set -a
# shellcheck disable=SC1090
source "$ENV_TMP"
set +a
rm -f "$ENV_TMP"

: "${POSTGRES_HOST:?POSTGRES_HOST missing from $ENV_FILE}"
: "${POSTGRES_ROOT_USER:?POSTGRES_ROOT_USER missing from $ENV_FILE}"
: "${POSTGRES_ROOT_PWD:?POSTGRES_ROOT_PWD missing from $ENV_FILE}"
: "${FOXNOX_DB_NAME:?FOXNOX_DB_NAME missing from $ENV_FILE}"

echo "→ resetting e2e accounts (userId ${E2E_USER_IDS})"
docker exec -i -e PGPASSWORD="$POSTGRES_ROOT_PWD" "$POSTGRES_HOST" \
  psql -U "$POSTGRES_ROOT_USER" -d "$FOXNOX_DB_NAME" -v ON_ERROR_STOP=1 >/dev/null <<SQL
DELETE FROM token WHERE "userId" IN (${E2E_USER_IDS});
DELETE FROM user_trusted_device WHERE "userId" IN (${E2E_USER_IDS});
DELETE FROM user_security_answer WHERE "userId" IN (${E2E_USER_IDS});
DELETE FROM pwd WHERE "userId" IN (${E2E_USER_IDS});
SQL

# Created up front so Docker doesn't materialise the bind mounts as root-owned dirs.
mkdir -p web/test-results web/playwright-report

# Gatelin rate-limits /sessions (20 per 15 min, in memory) and every login or admin
# load in this suite spends it. A restart gives each run a full budget.
echo "→ restarting gatelin to reset its /sessions rate limit"
docker restart "${APP_NAME}-gatelin-${ENV_NAME}" >/dev/null
for _ in {1..30}; do
  [[ "$(docker inspect -f '{{.State.Health.Status}}' "${APP_NAME}-gatelin-${ENV_NAME}")" == "healthy" ]] && break
  sleep 2
done

exec docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" --profile e2e \
  run --rm --no-deps web-e2e test "$@"
