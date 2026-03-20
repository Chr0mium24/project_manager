#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"

PORT="${PORT:-3100}"
GATEWAY_PORT="${GATEWAY_PORT:-3101}"
BASE_URL="http://127.0.0.1:${PORT}"
VITE_HEALTH_URL="${BASE_URL}/"
GATEWAY_HEALTH_URL="http://127.0.0.1:${GATEWAY_PORT}/healthz"
OPEN_BROWSER="${PROJECT_MANAGER_OPEN_BROWSER:-1}"

cleanup() {
  for pid in "${WEB_PID:-}" "${GATEWAY_PID:-}"; do
    if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1; then
      kill "${pid}" >/dev/null 2>&1 || true
    fi
  done
}

kill_listener_on_port() {
  local port="$1"
  local listener_pids

  listener_pids="$(lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "${listener_pids}" ]]; then
    return 0
  fi

  echo "[dev-up] stopping existing listener(s) on tcp:${port}: ${listener_pids}"
  for pid in ${listener_pids}; do
    kill "${pid}" >/dev/null 2>&1 || true
  done

  sleep 1
}

wait_for_url() {
  local service_name="$1"
  local service_pid="$2"
  local service_url="$3"
  local attempt

  for attempt in $(seq 1 60); do
    if ! kill -0 "${service_pid}" >/dev/null 2>&1; then
      echo "[dev-up] ${service_name} exited before becoming ready" >&2
      return 1
    fi

    if node --input-type=module -e "const url = process.argv[1]; try { const response = await fetch(url); process.exit(response.ok ? 0 : 1); } catch { process.exit(1); }" "${service_url}"; then
      return 0
    fi

    sleep 1
  done

  echo "[dev-up] ${service_name} did not become healthy within 60s" >&2
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

kill_listener_on_port "${PORT}"
kill_listener_on_port "${GATEWAY_PORT}"

echo "[dev-up] starting gateway on http://127.0.0.1:${GATEWAY_PORT}/"
env PORT="${GATEWAY_PORT}" PROJECT_MANAGER_ADMIN_TOKEN="${PROJECT_MANAGER_ADMIN_TOKEN}" corepack pnpm dev:gateway &
GATEWAY_PID=$!

wait_for_url "gateway" "${GATEWAY_PID}" "${GATEWAY_HEALTH_URL}"

echo "[dev-up] starting Vite on ${BASE_URL}/"
echo "[dev-up] admin token: ${PROJECT_MANAGER_ADMIN_TOKEN}"
echo "[dev-up] override with: PORT=3200 GATEWAY_PORT=3201 PROJECT_MANAGER_ADMIN_TOKEN=my-token PROJECT_MANAGER_OPEN_BROWSER=0 ./scripts/dev-up.sh"

env VITE_GATEWAY_ORIGIN="http://127.0.0.1:${GATEWAY_PORT}" corepack pnpm --filter @project-manager/web dev -- --host 127.0.0.1 --port "${PORT}" &
WEB_PID=$!

if wait_for_url "vite" "${WEB_PID}" "${VITE_HEALTH_URL}"; then
  echo "[dev-up] management UI is ready at ${BASE_URL}/"
  open_browser
fi

wait "${WEB_PID}"
