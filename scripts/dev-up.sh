#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"

if ! command -v corepack >/dev/null 2>&1; then
  echo "[dev-up] corepack is required but was not found in PATH" >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "[dev-up] node_modules not found, installing dependencies"
  corepack pnpm install
fi

PORT="${PORT:-3100}"

if [[ -z "${PROJECT_MANAGER_ADMIN_TOKEN:-}" ]]; then
  export PROJECT_MANAGER_ADMIN_TOKEN="local-dev-token"
  echo "[dev-up] PROJECT_MANAGER_ADMIN_TOKEN not set, defaulting to ${PROJECT_MANAGER_ADMIN_TOKEN}"
else
  echo "[dev-up] using PROJECT_MANAGER_ADMIN_TOKEN from environment"
fi

echo "[dev-up] starting gateway on http://127.0.0.1:${PORT}/"
echo "[dev-up] admin token: ${PROJECT_MANAGER_ADMIN_TOKEN}"
echo "[dev-up] override with: PORT=3200 PROJECT_MANAGER_ADMIN_TOKEN=my-token ./scripts/dev-up.sh"

exec env PORT="${PORT}" PROJECT_MANAGER_ADMIN_TOKEN="${PROJECT_MANAGER_ADMIN_TOKEN}" corepack pnpm dev:gateway
