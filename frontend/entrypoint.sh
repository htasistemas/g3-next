#!/bin/sh
set -e

API_BASE_URL="${API_BASE_URL:-}"
export API_BASE_URL
VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-${GOOGLE_CLIENT_ID:-}}"
VITE_GOOGLE_ALLOWED_ORIGINS="${VITE_GOOGLE_ALLOWED_ORIGINS:-}"
export VITE_GOOGLE_CLIENT_ID
export VITE_GOOGLE_ALLOWED_ORIGINS

CONFIG_FILE="/usr/share/nginx/html/assets/config.json"
if [ -f "$CONFIG_FILE" ]; then
  envsubst < "$CONFIG_FILE" > "${CONFIG_FILE}.tmp"
  mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"
fi

ENV_FILE="/usr/share/nginx/html/env-config.js"
if [ -f "$ENV_FILE" ]; then
  sed -i \
    -e "s|__ENV_API_URL__|${API_BASE_URL}|g" \
    -e "s|__ENV_GOOGLE_CLIENT_ID__|${VITE_GOOGLE_CLIENT_ID}|g" \
    -e "s|__ENV_GOOGLE_ALLOWED_ORIGINS__|${VITE_GOOGLE_ALLOWED_ORIGINS}|g" \
    "$ENV_FILE"
fi

find /usr/share/nginx/html -type f -name "*.js" -exec \
  sh -c "sed -i \"s|http://localhost:8080|${API_BASE_URL}|g; s|http://localhost:3333|${API_BASE_URL}|g\" \"\\$1\"" _ {} \;

exec nginx -g 'daemon off;'
