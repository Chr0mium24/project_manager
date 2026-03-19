#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ $# -ne 1 ]]; then
  echo "usage: ./scripts/codex-start-task.sh <slug>" >&2
  exit 1
fi

node scripts/start-task-branch.mjs "$1"
