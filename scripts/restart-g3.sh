#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/srv/g3n}"
APP_COMPOSE="$APP_DIR/docker-compose.yml"

log() { printf "[%s] %s\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

container_health() {
  local name="$1"
  local id
  id="$(docker compose -f "$APP_COMPOSE" ps -q "$name" || true)"
  if [[ -z "$id" ]]; then
    echo "missing"
    return 0
  fi
  docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' "$id" 2>/dev/null || echo "missing"
}

wait_healthy() {
  local name="$1"
  local timeout="${2:-120}"
  local start
  local status
  start="$(date +%s)"
  while true; do
    status="$(container_health "$name")"
    if [[ "$status" == "healthy" ]]; then
      log "$name is healthy"
      return 0
    fi
    if [[ "$status" == "unhealthy" ]]; then
      log "$name is unhealthy"
      return 1
    fi
    if (( "$(date +%s)" - start >= timeout )); then
      log "$name healthcheck timeout after ${timeout}s (status: $status)"
      return 1
    fi
    sleep 3
  done
}

log "Restart g3-next stack"
cd "$APP_DIR"

log "Start db, backend, frontend"
docker compose -f "$APP_COMPOSE" up -d g3n-db g3n-backend g3n-frontend

wait_healthy g3n-db 120

if ! wait_healthy g3n-backend 180; then
  log "Backend failed healthcheck. Restarting backend..."
  docker compose -f "$APP_COMPOSE" up -d --force-recreate g3n-backend
  wait_healthy g3n-backend 200
fi

wait_healthy g3n-frontend 180

log "Start nginx-g3n after dependencies are healthy"
docker compose -f "$APP_COMPOSE" up -d --force-recreate nginx-g3n
wait_healthy nginx-g3n 120

if [[ -n "${TUNNEL_TOKEN:-}" ]]; then
  log "Ensure g3n tunnel is up"
  docker compose -f "$APP_COMPOSE" up -d --force-recreate g3n-tunnel
else
  log "Skipping g3n tunnel (TUNNEL_TOKEN not set)"
fi

if [ -x "$APP_DIR/scripts/deploy-check.sh" ]; then
  log "Post-restart checks"
  APP_DIR="$APP_DIR" "$APP_DIR/scripts/deploy-check.sh"
else
  log "Post-restart checks skipped (script not found)"
fi

log "Done"
