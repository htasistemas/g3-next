#!/bin/sh
set -e

API_BASE_URL="${API_BASE_URL:-https://g3n.htasistemas.com.br}"
export API_BASE_URL

CONFIG_FILE="/usr/share/nginx/html/assets/config.json"
if [ -f "$CONFIG_FILE" ]; then
  envsubst < "$CONFIG_FILE" > "${CONFIG_FILE}.tmp"
  mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"
fi

find /usr/share/nginx/html -type f -name "*.js" -exec \
  sh -c "sed -i \"s|http://localhost:8080|${API_BASE_URL}|g; s|http://localhost:3333|${API_BASE_URL}|g\" \"\\$1\"" _ {} \;

exec nginx -g 'daemon off;'
