#!/bin/sh
set -e

API_URL="${API_BASE_URL:-https://g3n.htasistemas.com.br}"
case "$API_URL" in
  http://*|https://*) ;;
  *) API_URL="https://$API_URL" ;;
esac

export API_URL

INDEX_FILE="/usr/share/nginx/html/index.html"
[ -f "$INDEX_FILE" ] && python3 - <<'PY'
import os
from pathlib import Path

api_url = os.environ.get("API_URL", "http://localhost:8080")
path = Path("/usr/share/nginx/html/index.html")
text = path.read_text()
text = text.replace("__ENV_API_URL__", api_url)
path.write_text(text)
PY

exec nginx -g 'daemon off;'
