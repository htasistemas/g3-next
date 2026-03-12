#!/usr/bin/env bash
set -euo pipefail

VERSION_FILE="${1:-backend/src/main/resources/static/version.txt}"

if [ ! -f "$VERSION_FILE" ]; then
  echo "Arquivo de versao nao encontrado: $VERSION_FILE" >&2
  exit 1
fi

version="$(sed -n '1p' "$VERSION_FILE" | tr -d '\r' | xargs)"

if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Formato de versao invalido: $version" >&2
  exit 1
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
printf "%s\n" "$new_version"
