#!/bin/bash

# Reset Database Script
# Removes postgres + migration containers and the postgres volume, then
# rebuilds the stack and re-seeds mock user passwords (setup-mocks.sh).

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🗑️  Resetting database...${NC}"

ENV_FILE="docker/conf/.env.dev"
if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}Error:${NC} $ENV_FILE not found. Run scripts/setup-env.sh first." >&2
  exit 1
fi

# Load container names from .env.dev (same approach as setup-mocks.sh).
ENV_TMP=$(mktemp)
grep -v '^#' "$ENV_FILE" | grep -v '^UID=' > "$ENV_TMP"
set -a
# shellcheck disable=SC1090
source "$ENV_TMP"
set +a
rm -f "$ENV_TMP"

: "${POSTGRES_HOST:?POSTGRES_HOST missing from $ENV_FILE}"
: "${FOXNOX_MIGRATION_HOST:?FOXNOX_MIGRATION_HOST missing from $ENV_FILE}"
: "${GATELIN_MIGRATION_HOST:?GATELIN_MIGRATION_HOST missing from $ENV_FILE}"
: "${APP_NAME:?APP_NAME missing from $ENV_FILE}"

VOLUME_NAME="${APP_NAME}_postgres_data"

# Stop and remove containers
echo -e "📦 Removing containers..."
for c in "$POSTGRES_HOST" "$FOXNOX_MIGRATION_HOST" "$GATELIN_MIGRATION_HOST"; do
  if docker rm -f "$c" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Removed $c"
  else
    echo -e "${YELLOW}⚠${NC}  Container $c not found"
  fi
done

# Remove volume
echo -e "💾 Removing volume..."
if ! docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠${NC}  Volume $VOLUME_NAME not found"
elif docker volume rm "$VOLUME_NAME"; then
  echo -e "${GREEN}✓${NC} Removed volume $VOLUME_NAME"
else
  echo -e "${RED}✗${NC} Failed to remove volume $VOLUME_NAME (still in use?) — aborting so the fresh restart doesn't reuse stale data"
  exit 1
fi

echo -e "${GREEN}✅ Database reset complete!${NC}"

# Restart all services (migrations re-run against the empty volume)
echo -e ""
./scripts/start-dev.sh

# Re-seed mock password hashes + refresh swagger credentials.
# setup-mocks.sh waits for foxnox health itself — no fixed sleep needed here.
echo -e ""
./scripts/setup-mocks.sh

echo -e ""
echo -e "${GREEN}🎉 All done! Fresh database with mock passwords ready.${NC}"
