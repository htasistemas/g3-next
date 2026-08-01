#!/usr/bin/env bash
set -euo pipefail

VERSION_FILE="${1:-updates/version.txt}"
STATE_VERSION_FILE="${STATE_VERSION_FILE:-}"

trim_value() {
  printf "%s" "$1" | tr -d '\r' | xargs
}

read_version_file() {
  local file_path="$1"

  if [ ! -f "$file_path" ]; then
    return 1
  fi

  local raw_version
  raw_version="$(sed -n '1p' "$file_path" || true)"
  trim_value "$raw_version"
}

is_valid_version() {
  local value="$1"
  [[ "$value" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
}

compare_versions() {
  local left="$1"
  local right="$2"
  local left_major left_minor left_patch
  local right_major right_minor right_patch

  IFS='.' read -r left_major left_minor left_patch <<< "$left"
  IFS='.' read -r right_major right_minor right_patch <<< "$right"

  if (( 10#$left_major > 10#$right_major )); then
    return 0
  fi
  if (( 10#$left_major < 10#$right_major )); then
    return 1
  fi

  if (( 10#$left_minor > 10#$right_minor )); then
    return 0
  fi
  if (( 10#$left_minor < 10#$right_minor )); then
    return 1
  fi

  (( 10#$left_patch >= 10#$right_patch ))
}

sync_json_version_file() {
  local file_path="$1"

  if [ ! -f "$file_path" ]; then
    return 0
  fi

  sed -i -E \
    -e "s/\"latestVersion\"[[:space:]]*:[[:space:]]*\"[^\"]+\"/\"latestVersion\": \"$new_version\"/" \
    -e "s/\"minCompatibleVersion\"[[:space:]]*:[[:space:]]*\"[^\"]+\"/\"minCompatibleVersion\": \"$new_version\"/" \
    "$file_path"
}

sync_frontend_app_version() {
  local file_path="frontend/src/lib/app-version.ts"

  if [ ! -f "$file_path" ]; then
    return 0
  fi

  sed -i -E \
    "s#\\|\\|[[:space:]]*__APP_VERSION__[[:space:]]*\\|\\|[[:space:]]*\"[^\"]+\"#|| __APP_VERSION__ || \"$new_version\"#" \
    "$file_path"
}

if [ ! -f "$VERSION_FILE" ]; then
  echo "Arquivo de versao nao encontrado: $VERSION_FILE" >&2
  exit 1
fi

version="$(read_version_file "$VERSION_FILE")"

if ! is_valid_version "$version"; then
  echo "Formato de versao invalido: $version" >&2
  exit 1
fi

if [ -n "$STATE_VERSION_FILE" ] && [ -f "$STATE_VERSION_FILE" ]; then
  state_version="$(read_version_file "$STATE_VERSION_FILE" || true)"
  if [ -n "${state_version:-}" ] && is_valid_version "$state_version" && compare_versions "$state_version" "$version"; then
    version="$state_version"
  fi
fi

IFS='.' read -r major minor patch <<< "$version"

major_width="${#major}"
minor_width="${#minor}"
patch_width="${#patch}"

new_version="$(
  printf "%0${major_width}d.%0${minor_width}d.%0${patch_width}d" \
    "$((10#$major))" \
    "$((10#$minor))" \
    "$((10#$patch + 1))"
)"

printf "%s\n" "$new_version" > "$VERSION_FILE"
if [ -n "$STATE_VERSION_FILE" ]; then
  mkdir -p "$(dirname "$STATE_VERSION_FILE")"
  printf "%s\n" "$new_version" > "$STATE_VERSION_FILE"
fi
sync_json_version_file "updates/version.json"
sync_json_version_file "backend/updates/version.json"
sync_frontend_app_version
printf "%s\n" "$new_version"
