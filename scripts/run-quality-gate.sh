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

for stage in "${STAGES[@]}"; do
  echo "[quality-gate] ${stage}"
  npm run "${stage}"
done

node scripts/write-quality-gate-status.mjs "${STAGES[@]}"

echo "[quality-gate] done"
