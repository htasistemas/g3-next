#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/srv/g3n}"

cd "$APP_DIR"
APP_DIR="$APP_DIR" bash ./deploy.sh
