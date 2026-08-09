#!/bin/bash

# Stop Development Environment Script
# This script stops and removes all services and containers for this project
# Usage: ./stop-dev.sh [--rmi | -i]
#   --rmi, -i : Also remove images used by services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
REMOVE_IMAGES=false
if [[ "$1" == "--rmi" ]] || [[ "$1" == "-i" ]]; then
  REMOVE_IMAGES=true
fi

echo -e "${YELLOW}🛑 Stopping development environment...${NC}"

# Load environment variables
if [[ -f docker/conf/.env.dev ]]; then
  set -a
  source <(grep -v '^#' docker/conf/.env.dev | grep -v '^UID=')
  set +a
fi

# Set defaults if not loaded
APP_NAME=${APP_NAME:-foxnox}
ENV_NAME=${ENV_NAME:-local}

VOLUME_NAME="${APP_NAME}_postgres_data"

# Build docker compose command
COMPOSE_CMD="docker compose -f docker/docker-compose.yml --env-file docker/conf/.env.dev down"

# Add --rmi flag if requested
if [[ "$REMOVE_IMAGES" == true ]]; then
  COMPOSE_CMD="$COMPOSE_CMD --rmi all"
  echo -e "${YELLOW}⚠️  Images will also be removed${NC}"
fi

# Execute command
eval $COMPOSE_CMD

# Remove postgres volume (after containers are stopped) so it can never keep stale credentials across runs
echo -e "${YELLOW}🗑️  Removing postgres volume...${NC}"
if docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
  # Force-remove any leftover containers (e.g. never-started/orphaned ones) still holding the volume
  LEFTOVER_CONTAINERS=$(docker ps -a --filter "volume=$VOLUME_NAME" --format '{{.Names}}')
  if [[ -n "$LEFTOVER_CONTAINERS" ]]; then
    echo -e "${YELLOW}⚠${NC}  Removing leftover containers still using the volume: $LEFTOVER_CONTAINERS"
    docker rm -f $LEFTOVER_CONTAINERS >/dev/null 2>&1 || true
  fi

  if docker volume rm "$VOLUME_NAME" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Removed volume $VOLUME_NAME"
  else
    echo -e "${RED}✗${NC} Failed to remove volume $VOLUME_NAME (still in use) — aborting so stale data isn't reused on next start"
    exit 1
  fi
else
  echo -e "⚠  Volume $VOLUME_NAME not found"
fi

echo -e "${RED}✅ Development environment stopped and cleaned!${NC}"
if [[ "$REMOVE_IMAGES" == true ]]; then
  echo -e "All containers and images for this project have been removed."
else
  echo -e "All containers for this project have been removed. "
  echo -e "Run './stop-dev.sh --rmi' to also remove images."
fi
echo -e "Postgres volume has been removed. Run './start-dev.sh' to start fresh."
