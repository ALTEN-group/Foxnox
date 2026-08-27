#!/bin/bash

# Cleanup Foxnox Service Script
# This script removes only the Foxnox service container, image, and volume
# (Does not affect postgres, traefik, migration, or other services)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}🗑️  Cleaning up Foxnox service...${NC}"
echo -e ""

# Load environment variables
if [[ -f docker/conf/.env.dev ]]; then
  set -a
  source <(grep -v '^#' docker/conf/.env.dev | grep -v '^UID=')
  set +a
  echo -e "${BLUE}ℹ${NC}  Loaded environment variables from docker/conf/.env.dev"
else
  echo -e "${YELLOW}⚠${NC}  Environment file not found, using defaults"
fi

# Set defaults if not loaded
APP_NAME=${APP_NAME:-foxnox}
NODE_ENV=${NODE_ENV:-development}

# Define the specific Foxnox service container name
FOXNOX_CONTAINER="${APP_NAME}"

echo -e "${BLUE}ℹ${NC}  Target container: $FOXNOX_CONTAINER"
echo -e ""

# =====================
# STOP AND REMOVE CONTAINER
# =====================
echo -e "${YELLOW}📦 Stopping and removing Foxnox container...${NC}"

docker rm -f "$FOXNOX_CONTAINER" 2>/dev/null && echo -e "${GREEN}✓${NC} Removed container: $FOXNOX_CONTAINER" || echo -e "${YELLOW}⚠${NC}  Container $FOXNOX_CONTAINER not found"

echo -e ""

# =====================
# REMOVE IMAGE
# =====================
echo -e "${YELLOW}🖼️  Removing Foxnox image...${NC}"

FOXNOX_IMAGE="foxnox:${NODE_ENV}"
docker rmi -f "$FOXNOX_IMAGE" 2>/dev/null && echo -e "${GREEN}✓${NC} Removed image: $FOXNOX_IMAGE" || echo -e "${YELLOW}⚠${NC}  Image $FOXNOX_IMAGE not found"

echo -e ""

# =====================
# REMOVE VOLUME
# =====================
echo -e "${YELLOW}💾 Checking for Foxnox node_modules volume...${NC}"

# Look for the specific foxnox_node_modules volume
FOXNOX_VOLUME="${APP_NAME}_foxnox_node_modules"

if docker volume inspect "$FOXNOX_VOLUME" >/dev/null 2>&1; then
  docker volume rm "$FOXNOX_VOLUME" 2>/dev/null && echo -e "${GREEN}✓${NC} Removed volume: $FOXNOX_VOLUME" || echo -e "${RED}✗${NC} Failed to remove volume: $FOXNOX_VOLUME"
else
  echo -e "${YELLOW}⚠${NC}  Volume $FOXNOX_VOLUME not found"
fi

echo -e ""
echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo -e "${BLUE}ℹ${NC}  The Foxnox service container, image and volume have been removed."
echo -e "${BLUE}ℹ${NC}  Other services (postgres, traefik, etc.) remain untouched."

# Restart all services
echo -e ""
./scripts/start-dev.sh