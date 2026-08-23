#!/bin/sh
set -e

# Optional SSO storage-key override (empty → {}). Injected into the built
# index.html at container start so ops can change it without an image rebuild.
FILE="/usr/share/caddy/foxnox/index.html"
if [ -n "$ADMIN_SSO_TOKEN_KEY" ]; then
  PAYLOAD="{\"ssoTokenKey\":\"$ADMIN_SSO_TOKEN_KEY\"}"
else
  PAYLOAD="{}"
fi
sed -i "s#<script id=\"foxnox-admin-runtime\">.*</script>#<script id=\"foxnox-admin-runtime\">window.__FOXNOX_ADMIN__=$PAYLOAD;</script>#" "$FILE"

exec "$@"
