# Sandbox And Git Policy

## Goal

Codex must be able to help with development without damaging unrelated projects or escaping the intended workspace.

## Workspace rule

Codex may operate only inside the current repository workspace unless explicitly instructed otherwise.

That means:

- no editing sibling repositories
- no editing parent directories
- no scanning unrelated project trees
- no using the home directory as a general workspace

## Git policy

Codex may perform Git operations, but only within controlled boundaries.

Allowed:

- `git status`
- `git diff`
- `git add`
- `git commit`
- `git branch`
- `git switch`
- `git worktree` for isolated task workspaces

Forbidden by default:

- force push
- rewriting published history
- deleting branches without explicit instruction
- modifying tags without explicit instruction
- direct pushes to protected mainline branches
- pull request creation by Codex

## Safe Git workflow

Preferred flow for Codex-driven changes:

1. create or switch to a task branch through `./scripts/codex-start-task.sh <slug>`
2. make scoped changes
3. run `./scripts/run-quality-gate.sh`
4. commit only through `./scripts/codex-safe-git.sh commit ...` after the gate passes
5. stop at a local branch plus commits; do not create a PR

For isolated tasks, prefer a Git worktree or task-specific temporary workspace.

Implementation note:

- the safe Git wrapper checks a gate-status stamp written by the quality gate
- it blocks commit when the branch changed, `HEAD` changed, or the worktree changed after the gate
- it blocks commits on `main` and `master`
- it blocks commits on non-`task/<slug>` branches
- `./scripts/codex-safe-gh.sh` exists only to reject PR creation explicitly

## Sandbox policy

Codex execution should default to a writable project sandbox, not unrestricted access.

Preferred execution model:

- writable only inside the current repo
- temporary directories only for task-local scratch space
- no network unless the task truly requires it
- no access to unrelated repositories

## Port policy

There is exactly one public port.

Codex must not introduce new public ports ad hoc.

Allowed model:

- one main server
- path-based routing
- internal handlers or internal workers behind that server

If a local helper process needs to expose functionality:

- it must be registered through the approved route-registration script
- it must not claim a new public port
- it must remain internal to the main server

## Registration rule

No feature should bind an externally visible port directly unless the architecture docs are updated and the change is explicitly approved.

For development, any route or runtime exposure should go through an approved registration script.

## V1 simplification

V1 should avoid dynamic port sprawl completely.

Prefer:

- in-process handlers
- internal module routing
- one Fastify entrypoint

Do not design V1 around many separate listening services.
