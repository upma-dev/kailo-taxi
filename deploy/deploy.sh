#!/usr/bin/env bash
# Kailo Taxi: one-command deploy on the VPS.   Usage:  ~/kailo-taxi/deploy/deploy.sh
# Does: git pull -> build React -> copy to Nginx folder -> install backend deps -> reload PM2 (API, socket, workers).
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/kailo-taxi}"
WEB_ROOT="${WEB_ROOT:-/var/www/kailo-taxi}"
BRANCH="${BRANCH:-main}"

echo "Deploy started ($(date '+%F %T'))"
cd "$APP_DIR"
git pull origin "$BRANCH"

# ---------- Frontend ----------
echo "Building frontend..."
cd "$APP_DIR/Frontend"
npm ci
npm run build
sudo mkdir -p "$WEB_ROOT"
sudo rm -rf "${WEB_ROOT:?}"/*
sudo cp -r dist/* "$WEB_ROOT"/

# ---------- Backend ----------
# sharp (libvips) ships prebuilt binaries for Linux, so npm ci is enough; no system libvips needed.
echo "Installing backend..."
cd "$APP_DIR/Backend"
npm ci --omit=dev

# ---------- PM2 ----------
cd "$APP_DIR"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "Deploy finished. Check: pm2 status  |  curl -s http://127.0.0.1:5000/health"
