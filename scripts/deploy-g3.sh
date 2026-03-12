#!/usr/bin/env bash
set -euo pipefail

cd /home/srv/g3

if [ ! -f "docker/cloudflared/config.yml" ]; then
  echo "Arquivo docker/cloudflared/config.yml nao encontrado."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker nao encontrado."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "Docker Compose nao encontrado."
  exit 1
fi

container_health() {
  local name="$1"
  local id
  id="$($COMPOSE ps -q "$name" || true)"
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
      echo "$name is healthy"
      return 0
    fi
    if [[ "$status" == "unhealthy" ]]; then
      echo "$name is unhealthy"
      return 1
    fi
    if (( "$(date +%s)" - start >= timeout )); then
      echo "$name healthcheck timeout after ${timeout}s (status: $status)"
      return 1
    fi
    sleep 3
  done
}

APP_VERSION="$(bash ./scripts/bump-version.sh)"
echo "Versao definida para $APP_VERSION"

$COMPOSE up -d --build backend frontend

echo "Aguardando backend..."
wait_healthy backend 180 || { echo "Erro: backend nao respondeu /health"; exit 1; }

echo "Aguardando frontend..."
wait_healthy frontend 180 || { echo "Erro: frontend nao respondeu"; exit 1; }

echo "Deploy finalizado."
