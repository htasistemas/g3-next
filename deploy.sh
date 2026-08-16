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

print_container_health() {
  local name="$1"
  local id
  id="$(docker compose -f "$APP_COMPOSE" ps -q "$name" || true)"
  if [[ -z "$id" ]]; then
    return 0
  fi
  log "Health details for $name"
  docker inspect --format='{{json .State.Health}}' "$id" || true
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

remove_runtime_container() {
  local name="$1"

  if ! docker inspect "$name" >/dev/null 2>&1; then
    return 0
  fi

  log "Removing existing container $name before Compose reconciliation (volumes preserved)"
  docker rm -f "$name" >/dev/null
}

reconcile_runtime_containers() {
  # Containers internos são descartáveis; proxy e túnel permanecem ativos
  # para que o Cloudflare continue exibindo a página de manutenção.
  remove_runtime_container g3n-db
  remove_runtime_container g3n-backend
  remove_runtime_container g3n-frontend
}

if [ -f "$TUNNEL_COMPOSE" ]; then
  log "ERROR: $TUNNEL_COMPOSE existe. Este arquivo nao deve ser usado."
  log "Remova-o para evitar queda do sistema."
  exit 1
fi

cd "$APP_DIR"
mkdir -p "$DEPLOY_STATE_DIR"

log "Deploy g3n stack"
if [[ "${DEPLOY_SKIP_GIT_PULL:-0}" != "1" ]] && [[ -d ".git" ]]; then
  log "Atualizando checkout Git antes do build"
  git fetch origin
  git pull --ff-only --autostash
fi

APP_VERSION="$(sed -n '1p' updates/version.txt | tr -d '\r' | xargs)"
if [[ ! "$APP_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  log "ERROR: versao invalida em updates/version.txt: ${APP_VERSION:-vazia}"
  exit 1
fi
printf "%s\n" "$APP_VERSION" > "$STATE_VERSION_FILE"
log "Version set from repository to $APP_VERSION"

enable_maintenance
log "Maintenance mode enabled"

# O proxy de borda deve permanecer ativo durante todo o deploy. Com o modo de
# manutenção habilitado, ele serve maintenance.html enquanto os demais
# containers são reconstruídos, evitando que o Cloudflare receba 502.
docker compose -f "$APP_COMPOSE" up -d --remove-orphans nginx-g3n

reconcile_runtime_containers
docker compose -f "$APP_COMPOSE" up -d --remove-orphans g3n-db
wait_healthy g3n-db 120

log "Garantindo que o storage MinIO esteja ativo"
docker compose -f "$APP_COMPOSE" up -d --remove-orphans g3n-minio

docker compose -f "$APP_COMPOSE" build g3n-backend
log "Aplicando migrations do PostgreSQL"
if ! docker compose -f "$APP_COMPOSE" run --rm --no-deps g3n-backend npx prisma migrate deploy; then
  log "Historico Prisma ausente em banco legado; aplicando migrations educacionais idempotentes"
  for migration in \
    20260718_create_educacional_fase1 \
    20260719_add_tipo_unidade_atendimento \
    20260719_create_educacional_academico \
    20260719_create_educacional_alunos_fluxos \
    20260719_create_educacional_avaliacoes \
    20260719_create_educacional_boletim_historico \
    20260719_create_educacional_creche \
    20260719_create_educacional_diario \
    20260719_create_educacional_documentos \
    20260719_create_educacional_ocorrencias_agenda \
    20260719_create_educacional_planejamento \
    20260719_create_educacional_fluxo_academico \
    20260719_harden_educacional_integridade \
    20260803_prestacao_contas_profissional \
    20260813_login_contexto_organizacional \
    20260813_gestao_parcerias_instrumentos \
    20260814_harden_gestao_parcerias \
    20260815_vinculo_termo_fomento_parceria; do
    docker compose -f "$APP_COMPOSE" run --rm --no-deps g3n-backend npx prisma db execute --schema prisma/schema.prisma --file "prisma/migrations/$migration/migration.sql"
  done
fi
docker compose -f "$APP_COMPOSE" build --no-cache g3n-frontend
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
if ! wait_healthy nginx-g3n 120; then
  print_container_health nginx-g3n
  print_container_logs nginx-g3n
  exit 1
fi

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
