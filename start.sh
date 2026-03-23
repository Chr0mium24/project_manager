#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${ROOT_DIR}"

if [[ "${1:-}" = "--help" ]]; then
  cat <<'EOF'
Usage: ./start.sh

Starts the local Project Manager development stack.

Optional environment overrides:
  PORT=3100
  GATEWAY_PORT=3101
  PROJECT_MANAGER_ADMIN_TOKEN=local-dev-token
  PROJECT_MANAGER_OPEN_BROWSER=1
EOF
  exit 0
fi

exec ./scripts/dev-up.sh "$@"
