#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"

PORT="${PORT:-3100}"
BASE_URL="http://127.0.0.1:${PORT}"
HEALTH_URL="${BASE_URL}/healthz"
OPEN_BROWSER="${PROJECT_MANAGER_OPEN_BROWSER:-1}"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
  fi
}

wait_for_gateway() {
  local attempt
  for attempt in $(seq 1 60); do
    if ! kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
      echo "[dev-up] gateway exited before becoming ready" >&2
      return 1
    fi

    if node --input-type=module -e "const url = process.argv[1]; try { const response = await fetch(url); process.exit(response.ok ? 0 : 1); } catch { process.exit(1); }" "${HEALTH_URL}"; then
      return 0
    fi

    sleep 1
  done

  echo "[dev-up] gateway did not become healthy within 60s" >&2
  return 1
}

open_browser() {
  if [[ "${OPEN_BROWSER}" = "0" ]]; then
    echo "[dev-up] browser auto-open disabled via PROJECT_MANAGER_OPEN_BROWSER=0"
    return 0
  fi

  if command -v open >/dev/null 2>&1; then
    open "${BASE_URL}/" >/dev/null 2>&1 &
    echo "[dev-up] opened ${BASE_URL}/"
    return 0
  fi

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${BASE_URL}/" >/dev/null 2>&1 &
    echo "[dev-up] opened ${BASE_URL}/"
    return 0
  fi

  echo "[dev-up] no browser opener found, open ${BASE_URL}/ manually"
}

if ! command -v corepack >/dev/null 2>&1; then
  echo "[dev-up] corepack is required but was not found in PATH" >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "[dev-up] node_modules not found, installing dependencies"
  corepack pnpm install
fi

if [[ -z "${PROJECT_MANAGER_ADMIN_TOKEN:-}" ]]; then
  export PROJECT_MANAGER_ADMIN_TOKEN="local-dev-token"
  echo "[dev-up] PROJECT_MANAGER_ADMIN_TOKEN not set, defaulting to ${PROJECT_MANAGER_ADMIN_TOKEN}"
else
  echo "[dev-up] using PROJECT_MANAGER_ADMIN_TOKEN from environment"
fi

trap cleanup EXIT INT TERM

echo "[dev-up] starting gateway on ${BASE_URL}/"
echo "[dev-up] admin token: ${PROJECT_MANAGER_ADMIN_TOKEN}"
echo "[dev-up] override with: PORT=3200 PROJECT_MANAGER_ADMIN_TOKEN=my-token PROJECT_MANAGER_OPEN_BROWSER=0 ./scripts/dev-up.sh"

env PORT="${PORT}" PROJECT_MANAGER_ADMIN_TOKEN="${PROJECT_MANAGER_ADMIN_TOKEN}" corepack pnpm dev:gateway &
SERVER_PID=$!

if wait_for_gateway; then
  echo "[dev-up] gateway is healthy at ${BASE_URL}/"
  open_browser
fi

wait "${SERVER_PID}"
