#!/bin/sh
set -e

API_URL="${API_BASE_URL:-https://g3n.htasistemas.com.br}"
case "$API_URL" in
  http://*|https://*) ;;
  *) API_URL="https://$API_URL" ;;
esac

GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-${GOOGLE_CLIENT_ID:-}}"
GOOGLE_ALLOWED_ORIGINS="${VITE_GOOGLE_ALLOWED_ORIGINS:-}"

export API_URL
export GOOGLE_CLIENT_ID
export GOOGLE_ALLOWED_ORIGINS

ENV_FILE="/usr/share/nginx/html/env-config.js"
[ -f "$ENV_FILE" ] && python3 - <<'PY'
import os
from pathlib import Path

api_url = os.environ.get("API_URL", "http://localhost:8080")
google_client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
google_allowed_origins = os.environ.get("GOOGLE_ALLOWED_ORIGINS", "")
path = Path("/usr/share/nginx/html/env-config.js")
text = path.read_text()
text = text.replace("__ENV_API_URL__", api_url)
text = text.replace("__ENV_GOOGLE_CLIENT_ID__", google_client_id)
text = text.replace("__ENV_GOOGLE_ALLOWED_ORIGINS__", google_allowed_origins)
path.write_text(text)
PY

exec nginx -g 'daemon off;'
