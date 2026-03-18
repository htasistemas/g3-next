#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/srv/g3n}"
APP_COMPOSE="$APP_DIR/docker-compose.yml"
TUNNEL_COMPOSE="$APP_DIR/docker-compose.tunnel.yml"
DEPLOY_STATE_DIR="${DEPLOY_STATE_DIR:-$HOME/.g3n-deploy}"
STATE_VERSION_FILE="$DEPLOY_STATE_DIR/version.txt"
MAINTENANCE_DIR="${MAINTENANCE_DIR:-$APP_DIR/docker/runtime}"
MAINTENANCE_FLAG="${APP_MAINTENANCE_FLAG_PATH:-$MAINTENANCE_DIR/maintenance.enable}"
DEPLOY_OK=0

log() { printf "[%s] %s\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

enable_maintenance() {
  mkdir -p "$(dirname "$MAINTENANCE_FLAG")"
  cat > "$MAINTENANCE_FLAG" <<EOF
enabled_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
version=${APP_VERSION:-indefinida}
EOF
}

disable_maintenance() {
  rm -f "$MAINTENANCE_FLAG"
}

cleanup() {
  if [[ "$DEPLOY_OK" -eq 1 ]]; then
    disable_maintenance
    log "Maintenance mode disabled"
  else
    log "Deploy not completed successfully. Maintenance mode remains enabled at $MAINTENANCE_FLAG"
  fi
}

trap cleanup EXIT

print_container_logs() {
  local name="$1"
  log "Recent logs for $name"
  docker compose -f "$APP_COMPOSE" logs --tail=200 "$name" || true
}

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

if [ -f "$TUNNEL_COMPOSE" ]; then
  log "ERROR: $TUNNEL_COMPOSE existe. Este arquivo nao deve ser usado."
  log "Remova-o para evitar queda do sistema."
  exit 1
fi

cd "$APP_DIR"
mkdir -p "$DEPLOY_STATE_DIR"

log "Deploy g3n stack"
APP_VERSION="$(STATE_VERSION_FILE="$STATE_VERSION_FILE" bash ./scripts/bump-version.sh)"
log "Version set to $APP_VERSION"

enable_maintenance
log "Maintenance mode enabled"

docker compose -f "$APP_COMPOSE" up -d --remove-orphans g3n-db nginx-g3n
wait_healthy g3n-db 120
wait_healthy nginx-g3n 120

docker compose -f "$APP_COMPOSE" build g3n-backend g3n-frontend
docker compose -f "$APP_COMPOSE" up -d --remove-orphans --force-recreate g3n-backend

if ! wait_healthy g3n-backend 180; then
  log "Backend failed healthcheck. Rebuilding without cache..."
  print_container_logs g3n-backend
  docker compose -f "$APP_COMPOSE" build --no-cache g3n-backend
  docker compose -f "$APP_COMPOSE" up -d --force-recreate g3n-backend
  if ! wait_healthy g3n-backend 200; then
    print_container_logs g3n-backend
    exit 1
  fi
fi

docker compose -f "$APP_COMPOSE" up -d --remove-orphans --force-recreate g3n-frontend
if ! wait_healthy g3n-frontend 180; then
  print_container_logs g3n-frontend
  print_container_logs g3n-backend
  exit 1
fi

log "Refresh nginx-g3n after dependencies are healthy"
docker compose -f "$APP_COMPOSE" up -d --remove-orphans --force-recreate nginx-g3n
wait_healthy nginx-g3n 120

if [[ -n "${TUNNEL_TOKEN:-}" ]]; then
  log "Ensure g3n tunnel is up"
  docker compose -f "$APP_COMPOSE" up -d --remove-orphans --force-recreate g3n-tunnel
else
  log "Skipping g3n tunnel (TUNNEL_TOKEN not set)"
fi

if [ -x "$APP_DIR/scripts/deploy-check.sh" ]; then
  log "Post-deploy checks"
  APP_DIR="$APP_DIR" "$APP_DIR/scripts/deploy-check.sh"
else
  log "Post-deploy checks skipped (script not found)"
fi

DEPLOY_OK=1
log "Done"
