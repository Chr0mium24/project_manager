# Codex Development Rules

This repository is the planning and validation workspace for the project manager platform.

This file governs the `project_manager` repository itself.

Managed child projects operated by the platform use a different workflow:

- `docs/managed-project-codex-workflow.md`

## Source of truth

Read these first:

- `docs/README.md`
- `docs/tech-stack.md`
- `docs/development-architecture.md`
- `docs/testing-strategy.md`
- `docs/quality-gate.md`
- `docs/code-standards.md`
- `docs/routing-strategy.md`
- `docs/sandbox-and-git.md`

## Required workflow

After any code or config change, run:

```bash
./scripts/run-quality-gate.sh
```

Do not consider the task complete if this script fails.

## Git and sandbox rules

- Git operations must stay inside this repository
- Prefer `./scripts/codex-safe-git.sh` over raw Git commands
- Do not push directly to protected branches
- Do not open new public ports ad hoc
- If a route or runtime must be exposed in development, use the approved registration script

Approved helper scripts:

```bash
./scripts/codex-start-task.sh your-task-slug
./scripts/codex-safe-git.sh status
./scripts/register-dev-route.sh /app/demo internal-handler demo-runtime
```

Commit helper:

```bash
./scripts/codex-safe-git.sh commit -m "your message"
```

This commit path is blocked unless the quality gate passed on the current branch and unchanged worktree.

Branch rule:

- Codex work must happen on `task/<slug>` branches only
- Start or resume a task branch through `./scripts/codex-start-task.sh <slug>`
- Do not commit on `main` or `master`
- Do not create PRs
- Each completed slice must end with one local commit on the task branch
- Use a narrow commit that includes its tests and doc updates
- Preferred commit message format: `<type>(<scope>): <summary>`

Scope note:

- the one-slice-one-commit rule is for this repository only
- do not apply that cadence automatically to managed child projects

## Stack rules

- Runtime: `Node`
- Dev execution: `node --import tsx`
- Package manager: `corepack pnpm`
- Monorepo orchestrator: `turbo`
- Do not switch the primary runtime to `Bun` in V1
- Do not add compatibility shims for old runtimes, alternate runtimes, or multiple package managers

## Scope rules

- Keep features as small vertical slices
- Avoid unrelated cross-module edits
- Respect modular boundaries defined in `docs/development-architecture.md`
- Do not bypass scripts with manual file mutations when an official script exists

## Product constraints

- Projects are split into `static` and `dynamic`
- One public port only; route by path prefix
- Do not add support for deploying third-party GitHub projects in V1

## Validation workspace

For project-content experiments, use `validation/`.

If a runtime or tooling rule is unclear, verify it in `validation/` before changing the main architecture docs or main scripts.

Key script:

```bash
node validation/scripts/create-project.mjs --content-repo ./validation/content-repo --slug demo-static --name "Demo Static" --runtime static
```
