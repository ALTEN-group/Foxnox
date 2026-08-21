#!/bin/bash

# Reset Database Script
# Removes postgres + migration containers and the postgres volume, then rebuilds the
# stack via start-dev.sh, which re-seeds mock user passwords on the now-empty database.

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
: "${FOXNOX_HOST:?FOXNOX_HOST missing from $ENV_FILE}"
: "${GATELIN_HOST:?GATELIN_HOST missing from $ENV_FILE}"
: "${APP_NAME:?APP_NAME missing from $ENV_FILE}"

VOLUME_NAME="${APP_NAME}_postgres_data"

# Stop the app containers before the database disappears.
#
# Their connection pools live in @dwtechs/antity-pgsql, which registers no 'error'
# handler on the pg Pool. Deleting Postgres under an idle connection therefore raises
# "Connection terminated unexpectedly" as an unhandled event and kills the process —
# and under `node --watch` it then sits at "Waiting for file changes" rather than
# restarting. Shutting them down first avoids the crash entirely; start-dev.sh starts
# them again afterwards, which also rebuilds Gatelin's route/CORS caches from the
# re-seeded database. They hold no state, so stopping is enough — no need to recreate.
echo -e "🛑 Stopping app containers..."
for c in "$FOXNOX_HOST" "$GATELIN_HOST"; do
  if docker stop "$c" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Stopped $c"
  else
    echo -e "${YELLOW}⚠${NC}  Container $c not running"
  fi
done

# Remove the database and migration containers. These do have to go: Postgres must
# detach from the volume, and the one-shot migration containers only re-run when
# recreated (compose's service_completed_successfully is satisfied by a stale exit 0).
echo -e "📦 Removing containers..."
for c in "$FOXNOX_MIGRATION_HOST" "$GATELIN_MIGRATION_HOST" "$POSTGRES_HOST"; do
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

# Restart all services (migrations re-run against the empty volume). start-dev.sh then
# seeds mock passwords itself, since the volume we just deleted took the pwd rows with it.
echo -e ""
./scripts/start-dev.sh

echo -e ""
echo -e "${GREEN}🎉 All done! Fresh database with mock passwords ready.${NC}"
