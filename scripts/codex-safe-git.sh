#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ $# -lt 1 ]]; then
  echo "usage: ./scripts/codex-safe-git.sh <status|diff|add|commit|branch|switch|worktree> [args...]" >&2
  exit 1
fi

command="$1"
shift || true

case "${command}" in
  status)
    exec git status "$@"
    ;;
  diff)
    exec git diff "$@"
    ;;
  add)
    exec git add "$@"
    ;;
  commit)
    node scripts/check-commit-ready.mjs
    exec git commit "$@"
    ;;
  branch)
    exec git branch "$@"
    ;;
  switch)
    exec git switch "$@"
    ;;
  worktree)
    exec git worktree "$@"
    ;;
  *)
    echo "unsupported git operation: ${command}" >&2
    echo "allowed: status diff add commit branch switch worktree" >&2
    exit 2
    ;;
esac
