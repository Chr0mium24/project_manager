#!/usr/bin/env bash
set -euo pipefail

echo "GitHub PR operations are forbidden for Codex in V1." >&2
echo "Use a task branch and local commits only." >&2
exit 2
