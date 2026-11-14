#!/bin/bash
set -euo pipefail

# Seeds mock user passwords by calling Foxnox's own POST /foxnox/pwd endpoint (which uses
# @dwtechs/passken-express `create` to generate + hash server-side), then substitutes
# the returned plaintexts into swagger/src/foxnox.openapi.json.
#
# Because seeding happens via the running service, the stack must be up first:
#     scripts/setup-env.sh  →  scripts/start-dev.sh  →  scripts/setup-mocks.sh
#
# Idempotent: re-runs delete the previous mock pwd rows, generate fresh plaintexts,
# and reload swagger. Run this any time you want to rotate the mock credentials.
#
# Usage: setup-mocks.sh [--if-missing]
#   --if-missing : exit without touching anything when mock pwd rows already exist.
#                  start-dev.sh uses this so a fresh postgres volume gets seeded
#                  automatically while an ordinary restart keeps its passwords.

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ENV_FILE="docker/conf/.env.dev"
SWAGGER_EXAMPLE="swagger/src/foxnox.openapi.example.json"
SWAGGER_FILE="swagger/src/foxnox.openapi.json"
MOCK_USER_IDS=(1 2 3 4 5)

IF_MISSING=false
if [[ "${1:-}" == "--if-missing" ]]; then
  IF_MISSING=true
fi

# Cross-platform in-place sed (GNU/Linux vs macOS BSD)
if [[ "$OSTYPE" == "darwin"* ]]; then
  sedi() { sed -i '' "$@"; }
else
  sedi() { sed -i "$@"; }
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}Error:${NC} $ENV_FILE not found. Run scripts/setup-env.sh first." >&2
  exit 1
fi

# Load container names + postgres credentials from .env.dev.
# source <(...) process substitution failed to export vars here, so use a real temp file instead.
ENV_TMP=$(mktemp)
grep -v '^#' "$ENV_FILE" | grep -v '^UID=' > "$ENV_TMP"
set -a
# shellcheck disable=SC1090
source "$ENV_TMP"
set +a
rm -f "$ENV_TMP"

: "${FOXNOX_HOST:?FOXNOX_HOST missing from $ENV_FILE}"
: "${MEGADEX_HOST:?MEGADEX_HOST missing from $ENV_FILE}"
: "${POSTGRES_HOST:?POSTGRES_HOST missing from $ENV_FILE}"
: "${POSTGRES_ROOT_USER:?POSTGRES_ROOT_USER missing from $ENV_FILE}"
: "${POSTGRES_ROOT_PWD:?POSTGRES_ROOT_PWD missing from $ENV_FILE}"
: "${FOXNOX_DB_NAME:?FOXNOX_DB_NAME missing from $ENV_FILE}"
: "${MEGADEX_DB_NAME:?MEGADEX_DB_NAME missing from $ENV_FILE}"
: "${DEFAULT_PORT:?DEFAULT_PORT missing from $ENV_FILE}"
: "${SWAGGER_HOST:?SWAGGER_HOST missing from $ENV_FILE}"

# 1. Wait until the foxnox and megadex containers are healthy (up to ~60s).
for HOST in "$FOXNOX_HOST" "$MEGADEX_HOST"; do
  echo -e "${YELLOW}⏳ Waiting for ${HOST} to be healthy...${NC}"
  for i in {1..30}; do
    status=$(docker inspect -f '{{.State.Health.Status}}' "$HOST" 2>/dev/null || echo "missing")
    if [[ "$status" == "healthy" ]]; then
      echo -e "${GREEN}✓${NC} ${HOST} is healthy"
      break
    fi
    if [[ "$status" == "missing" ]]; then
      echo -e "${RED}Error:${NC} container ${HOST} not found. Run scripts/start-dev.sh first." >&2
      exit 1
    fi
    sleep 2
    if [[ $i -eq 30 ]]; then
      echo -e "${RED}Error:${NC} timed out waiting for ${HOST} to become healthy (last status: $status)." >&2
      exit 1
    fi
  done
done

# 1b. Ensure mock users (1..5) and web/e2e users (6..9) exist in megadex.
echo -e "${YELLOW}🌱 Ensuring mock users exist in ${MEGADEX_DB_NAME}...${NC}"
docker exec -i -e PGPASSWORD="$POSTGRES_ROOT_PWD" "$POSTGRES_HOST" \
  psql -U "$POSTGRES_ROOT_USER" -d "$MEGADEX_DB_NAME" -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
INSERT INTO "user" (id, civility, gender, "firstName", "middleName", "lastName", nickname, email, address, "zipCode", city, country, language, phone, portrait, active, archived, "creatorId", "creatorName")
VALUES
  (1, 'Mr.', 'M', 'Admin',    NULL,       'User',        'Admin',           'admin@example.com',         '123 Admin Street',    '75001', 'Paris', 'FRA', 'en', '+33123456789', NULL, true, false, -1, 'system'),
  (2, 'Ms.', 'F', 'Standard', NULL,       'User',        'StandardUser',    'standard@example.com',      '456 Standard Avenue', '75002', 'Paris', 'FRA', 'en', '+33987654321', NULL, true, false, -1, 'system'),
  (3, 'Mr.', 'M', 'Coco',     'Cocouser', 'Lastico',     'CLastico',        'coco@example.com',          '789 Club Boulevard',  '75003', 'Paris', 'FRA', 'en', '+33112233445', NULL, true, false, -1, 'system'),
  (4, 'Mr.', 'M', 'Guest',    NULL,       'User',        'GuestUser',       'guest@example.com',         '1 Guest Lane',        '75004', 'Paris', 'FRA', 'en', '+33600000004', NULL, true, false, -1, 'system'),
  (5, 'Ms.', 'F', 'Service',  NULL,       'User',        'ServiceUser',     'service@example.com',       '2 Service Street',    '75005', 'Paris', 'FRA', 'en', '+33600000005', NULL, true, false, -1, 'system'),
  (6, 'Ms.', 'F', 'Web',      NULL,       'E2E passwords','WebE2E-passwords','e2e-passwords@example.com','6 E2E Street',        '75006', 'Paris', 'FRA', 'en', '+33600000006', NULL, true, false, -1, 'system'),
  (7, 'Ms.', 'F', 'Web',      NULL,       'E2E twofa',   'WebE2E-twofa',    'e2e-twofa@example.com',     '6 E2E Street',        '75006', 'Paris', 'FRA', 'en', '+33600000006', NULL, true, false, -1, 'system'),
  (8, 'Ms.', 'F', 'Web',      NULL,       'E2E devices', 'WebE2E-devices',  'e2e-devices@example.com',   '6 E2E Street',        '75006', 'Paris', 'FRA', 'en', '+33600000006', NULL, true, false, -1, 'system'),
  (9, 'Ms.', 'F', 'Web',      NULL,       'E2E recover', 'WebE2E-recover',  'e2e-recover@example.com',   '6 E2E Street',        '75006', 'Paris', 'FRA', 'en', '+33600000006', NULL, true, false, -1, 'system')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('"user"', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM "user"), 9));

INSERT INTO user_role ("userId", "roleId", "creatorId", "creatorName")
VALUES
  (1, 2, -1, 'system'),
  (2, 3, -1, 'system'),
  (3, 1, -1, 'system'),
  (4, 4, -1, 'system'),
  (5, 5, -1, 'system'),
  (6, 1, -1, 'system'),
  (7, 1, -1, 'system'),
  (8, 1, -1, 'system'),
  (9, 1, -1, 'system')
ON CONFLICT ("userId", "roleId") DO NOTHING;
SQL

IDS_CSV=$(IFS=,; echo "${MOCK_USER_IDS[*]}")

# 2. Under --if-missing, keep existing credentials. foxnox is healthy by now and it
#    depends on foxnox_migration completing, so the pwd table is guaranteed to exist.
#    An unreadable count falls through to seeding rather than aborting the caller.
if [[ "$IF_MISSING" == true ]]; then
  EXISTING=$(docker exec -e PGPASSWORD="$POSTGRES_ROOT_PWD" "$POSTGRES_HOST" \
    psql -U "$POSTGRES_ROOT_USER" -d "$FOXNOX_DB_NAME" -tAc \
    "SELECT COUNT(*) FROM pwd WHERE \"userId\" IN (${IDS_CSV})" 2>/dev/null || echo "")
  if [[ -n "${EXISTING//[[:space:]]/}" && "${EXISTING//[[:space:]]/}" != "0" ]]; then
    echo -e "${GREEN}✓${NC} Mock passwords already seeded — leaving them untouched."
    echo -e "  Run ${YELLOW}scripts/setup-mocks.sh${NC} (no flag) to rotate them."
    exit 0
  fi
  echo -e "${YELLOW}🌱 No mock passwords found — seeding them now...${NC}"
fi

# 3. Clear any previous mock pwd rows so re-runs don't accumulate duplicates
#    (compare() picks the first row it finds, so stale rows would shadow the new ones).
echo -e "${YELLOW}🧹 Removing previous mock pwd rows (userId IN (${IDS_CSV}))...${NC}"
docker exec -e PGPASSWORD="$POSTGRES_ROOT_PWD" "$POSTGRES_HOST" \
  psql -U "$POSTGRES_ROOT_USER" -d "$FOXNOX_DB_NAME" -v ON_ERROR_STOP=1 -c \
  "DELETE FROM pwd WHERE \"userId\" IN (${IDS_CSV})" >/dev/null

# 4. Ask foxnox to generate a password for each mock user.
#    Runs the HTTP call from inside the foxnox container so we don't have to expose
#    /foxnox/ externally (it lives on the internal network behind the BFF).
BODY_JSON="{\"rows\":[$(printf '{"userId":%s},' "${MOCK_USER_IDS[@]}" | sed 's/,$//')]}"
echo -e "${YELLOW}🔐 Generating passwords via POST /foxnox/pwd ...${NC}"
RESPONSE=$(docker exec -i "$FOXNOX_HOST" node -e '
  let body = "";
  process.stdin.on("data", (c) => body += c);
  process.stdin.on("end", () => {
    const http = require("http");
    const req = http.request({
      host: "localhost",
      port: process.env.PORT || 3000,
      path: "/foxnox/pwd",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        // Tracked writes are rejected without a consumer, since that is what
        // stamps the audit columns the history trigger requires.
        "x-consumer-user-id": "1",
        "x-consumer-name": "seed-script",
      },
    }, (res) => {
      let out = "";
      res.on("data", (c) => out += c);
      res.on("end", () => {
        if (res.statusCode >= 400) {
          process.stderr.write(`POST /foxnox/pwd failed (${res.statusCode}): ${out}\n`);
          process.exit(1);
        }
        process.stdout.write(out);
      });
    });
    req.on("error", (err) => { process.stderr.write(err.message + "\n"); process.exit(1); });
    req.write(body); req.end();
  });
' <<< "$BODY_JSON")

# 5. Refresh the swagger file from the checked-in template and substitute plaintexts.
cp "$SWAGGER_EXAMPLE" "$SWAGGER_FILE"

# Extract `userId → pwd` pairs from the response using the same in-container node.
# Uses tab-delimited stdout since bash's `read` handles it without shell escaping woes.
PAIRS=$(docker exec -i "$FOXNOX_HOST" node -e '
  let d = "";
  process.stdin.on("data", (c) => d += c);
  process.stdin.on("end", () => {
    for (const r of JSON.parse(d).rows) console.log(`${r.userId}\t${r.pwd}`);
  });
' <<< "$RESPONSE")

echo ""
echo "Mock user plaintext passwords (printed once, not stored):"
while IFS=$'\t' read -r uid pwd; do
  [[ -z "$uid" ]] && continue
  sedi -e "s|__PWD_${uid}__|${pwd}|g" "$SWAGGER_FILE"
  printf "  userId %-3s = %s\n" "$uid" "$pwd"
done <<< "$PAIRS"

# 6. Restart swagger so `require("./foxnox.openapi.json")` re-reads the file.
echo ""
echo -e "${YELLOW}🔁 Reloading swagger container...${NC}"
docker compose -f docker/docker-compose.yml --env-file "$ENV_FILE" restart swagger >/dev/null
echo -e "${GREEN}✅ Done. Swagger is showing the fresh mock credentials at ${SERVER_SCHEME:-http://}${SERVER_URL:-localhost}:${TRAEFIK_PORT:-8200}/swagger${NC}"
