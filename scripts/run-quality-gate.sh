#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"

STAGES=(
  "format:check"
  "lint"
  "typecheck"
  "test:unit"
  "test:integration"
  "test:contract"
  "test:e2e:smoke"
  "test:git"
  "test:ai"
  "test:publish"
)

format_duration() {
  local total_seconds="$1"
  local minutes=$(( total_seconds / 60 ))
  local seconds=$(( total_seconds % 60 ))

  if (( minutes == 0 )); then
    printf "%ss" "${seconds}"
    return
  fi

  printf "%sm %ss" "${minutes}" "${seconds}"
}

run_stage() {
  local stage="$1"
  local started_at
  local finished_at
  local duration

  started_at="$(date +%s)"
  echo "[quality-gate] start ${stage}"

  if npm run "${stage}"; then
    finished_at="$(date +%s)"
    duration=$(( finished_at - started_at ))
    echo "[quality-gate] done ${stage} ($(format_duration "${duration}"))"
    return
  fi

  local exit_code=$?
  finished_at="$(date +%s)"
  duration=$(( finished_at - started_at ))
  echo "[quality-gate] failed ${stage} ($(format_duration "${duration}"))"
  exit "${exit_code}"
}

gate_started_at="$(date +%s)"

for stage in "${STAGES[@]}"; do
  run_stage "${stage}"
done

node scripts/write-quality-gate-status.mjs "${STAGES[@]}"

gate_finished_at="$(date +%s)"
echo "[quality-gate] done ($(format_duration "$(( gate_finished_at - gate_started_at ))"))"
