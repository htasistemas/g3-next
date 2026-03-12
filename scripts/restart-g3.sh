#!/usr/bin/env bash
set -euo pipefail

APP_COMPOSE="/home/srv/g3n/docker-compose.yml"

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

log "Restart g3 stack"

# Start core services (no rebuild) and let DB settle first
log "Start db, backend, frontend"
docker compose -f "$APP_COMPOSE" up -d db backend frontend

wait_healthy db 120

if ! wait_healthy backend 180; then
  log "Backend failed healthcheck. Restarting backend..."
  docker compose -f "$APP_COMPOSE" up -d --force-recreate backend
  wait_healthy backend 200
fi

wait_healthy frontend 180

log "Ensure g3 tunnel is up"
docker compose -f "$APP_COMPOSE" up -d --force-recreate g3-tunnel

if [ -x /home/srv/g3n/scripts/deploy-check.sh ]; then
  log "Post-restart checks"
  /home/srv/g3n/scripts/deploy-check.sh
else
  log "Post-restart checks skipped (script not found)"
fi

log "Done"
