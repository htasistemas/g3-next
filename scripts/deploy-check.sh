#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/srv/g3n}"
APP_COMPOSE="$APP_DIR/docker-compose.yml"
HOST_API_PORT="${HOST_API_PORT:-3333}"
HOST_FRONTEND_PORT="${HOST_FRONTEND_PORT:-3200}"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:${HOST_API_PORT}}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:${HOST_FRONTEND_PORT}}"
PUBLIC_FRONTEND_URL="${PUBLIC_FRONTEND_URL:-${APP_PUBLIC_URL:-https://g3n.htasistemas.com.br}}"
LOGIN_USER="${LOGIN_USER:-}"
LOGIN_PASS="${LOGIN_PASS:-}"

log() { printf "[%s] %s\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
fail() { log "ERRO: $*"; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Comando nao encontrado: $1"
}

require_cmd docker
require_cmd curl
require_cmd grep
require_cmd sed

checar_login_atual() {
  local base_url="${1%/}"
  local label="$2"
  local html_file="/tmp/g3n-frontend-${label}.html"
  local main_file="/tmp/g3n-frontend-main-${label}.js"
  local status
  local main_asset_paths
  local login_asset_paths
  local login_bundle_ok

  log "Checando login atual em $base_url/ ($label)"
  status="$(curl -sS -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' -o "$html_file" -w '%{http_code}' "$base_url/?_g3n_check=$(date +%s)")"
  if [ "$status" != "200" ]; then
    fail "Falha ao carregar frontend para validar login ($label, HTTP $status)"
  fi

  login_bundle_ok=0
  main_asset_paths="$(grep -Eo 'src="/assets/[^"]+\.js"' "$html_file" | sed -E 's#src="([^"]+)"#\1#' || true)"
  login_asset_paths=""
  for asset_path in $main_asset_paths; do
    curl -sS -H 'Cache-Control: no-cache' "$base_url$asset_path" -o "$main_file"
    login_asset_paths="$login_asset_paths $(grep -Eo 'assets/login-page-[^"]+\.js' "$main_file" | sort -u || true)"
  done
  for asset_path in $main_asset_paths $login_asset_paths; do
    normalized_asset_path="/${asset_path#/}"
    if curl -sS -H 'Cache-Control: no-cache' "$base_url$normalized_asset_path" | grep -q "CNPJ da institui"; then
      login_bundle_ok=1
      break
    fi
  done

  if [ "$login_bundle_ok" != "1" ]; then
    fail "Build publicado em $base_url nao contem o login atual com CNPJ da instituicao. Verifique checkout, imagem antiga, cache ou rota publica."
  fi
  log "Login atual com CNPJ OK ($label)"
}

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
checar_login_atual "$FRONTEND_URL" "local"
if [ "$PUBLIC_FRONTEND_URL" != "$FRONTEND_URL" ]; then
  checar_login_atual "$PUBLIC_FRONTEND_URL" "publico"
fi

portal_routes=(
  "/portal-doador"
  "/portal-voluntario"
  "/portal-beneficiario-familia"
  "/portal-transparencia"
  "/portal-parceiro-financiador"
)

for route in "${portal_routes[@]}"; do
  log "Checando portal publico em $FRONTEND_URL$route"
  portal_status="$(curl -sS -o /tmp/g3n-portal.html -w '%{http_code}' "$FRONTEND_URL$route")"
  if [ "$portal_status" != "200" ]; then
    fail "Falha no portal $route (HTTP $portal_status)"
  fi
done
log "Portais publicos OK"

log "Checando API publica dos portais em $BACKEND_URL/api/portais-externos/transparencia"
portais_api_status="$(curl -sS -o /tmp/g3n-portais-api.json -w '%{http_code}' "$BACKEND_URL/api/portais-externos/transparencia")"
if [ "$portais_api_status" != "200" ]; then
  fail "Falha na API publica dos portais (HTTP $portais_api_status) - resposta: $(cat /tmp/g3n-portais-api.json)"
fi
log "API publica dos portais OK"

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
