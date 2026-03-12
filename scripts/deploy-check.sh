#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/srv/g3n}"
APP_COMPOSE="$APP_DIR/docker-compose.yml"
HOST_API_PORT="${HOST_API_PORT:-3333}"
HOST_FRONTEND_PORT="${HOST_FRONTEND_PORT:-3200}"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:${HOST_API_PORT}}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:${HOST_FRONTEND_PORT}}"
LOGIN_USER="${LOGIN_USER:-}"
LOGIN_PASS="${LOGIN_PASS:-}"

log() { printf "[%s] %s\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
fail() { log "ERRO: $*"; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Comando nao encontrado: $1"
}

require_cmd docker
require_cmd curl

log "Verificando containers..."
docker compose -f "$APP_COMPOSE" ps -a

log "Checando backend em $BACKEND_URL/health"
health_status="$(curl -sS -o /tmp/g3n-health.json -w '%{http_code}' "$BACKEND_URL/health")"
if [ "$health_status" != "200" ]; then
  fail "Falha em /health (HTTP $health_status)"
fi
log "Health OK: $(cat /tmp/g3n-health.json)"

log "Checando frontend em $FRONTEND_URL/"
frontend_status="$(curl -sS -o /tmp/g3n-frontend.html -w '%{http_code}' "$FRONTEND_URL/")"
if [ "$frontend_status" != "200" ]; then
  fail "Falha no frontend (HTTP $frontend_status)"
fi
log "Frontend OK"

if [ -n "$LOGIN_USER" ] && [ -n "$LOGIN_PASS" ]; then
  log "Checando login em $FRONTEND_URL (usuario: $LOGIN_USER)"
  login_status="$(
    curl -sS -o /tmp/g3n-login.json -w '%{http_code}' \
      -H 'Content-Type: application/json' \
      -d "{\"nomeUsuario\":\"$LOGIN_USER\",\"senha\":\"$LOGIN_PASS\"}" \
      "$FRONTEND_URL/api/auth/login"
  )"
  if [ "$login_status" != "200" ]; then
    fail "Falha no login (HTTP $login_status) - resposta: $(cat /tmp/g3n-login.json)"
  fi
  log "Login OK"
else
  log "Login nao verificado (defina LOGIN_USER e LOGIN_PASS)."
fi

log "Concluido com sucesso."
