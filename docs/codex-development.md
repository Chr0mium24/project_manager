# Codex Development

## Rule

Codex must follow the same development gate as humans.

This document is about the `project_manager` repository itself.

That means:

- read the architecture docs first
- respect module boundaries
- prefer script-driven changes over manual workflow shortcuts
- run the quality gate after changes

## Required read order

1. `docs/README.md`
2. `docs/tech-stack.md`
3. `docs/development-architecture.md`
4. `docs/testing-strategy.md`
5. `docs/quality-gate.md`
6. `docs/code-standards.md`
7. `docs/routing-strategy.md`
8. `docs/sandbox-and-git.md`

## Required post-change command

```bash
./scripts/run-quality-gate.sh
```

If it fails:

- fix the issue
- or explicitly report the blocker

Do not stop after making code edits without running the gate.

## Git behavior

Codex may use Git, but only inside the main `project_manager` repository and within the safe workflow.

Preferred helper:

```bash
./scripts/codex-safe-git.sh status
```

Required branch helper:

```bash
./scripts/codex-start-task.sh your-task-slug
```

Commit rule:

- `./scripts/codex-safe-git.sh commit ...` is allowed only after `./scripts/run-quality-gate.sh` passes
- the safe Git wrapper validates the gate stamp before commit
- commits from `main` or `master` are blocked by the wrapper
- commits from non-`task/<slug>` branches are blocked by the wrapper
- Codex must stop at branch + commit; it must not create a PR

Commit cadence rule:

- each completed vertical slice must end with exactly one local commit
- do not accumulate many unrelated changes and commit them later as one batch
- if a task becomes multi-phase, split it into multiple narrow commits on the same task branch
- do not leave finished work uncommitted

Scope note:

- this commit cadence rule is for the main repository only
- it does not apply to managed child projects operated on by the platform
- managed project workflow is defined in `docs/managed-project-codex-workflow.md`

Commit content rule:

- one commit should represent one coherent change
- include related tests and required doc updates in the same commit
- do not mix unrelated refactors into the same commit
- if the change crosses multiple modules, document why before committing

Commit message rule:

- use a short imperative subject
- preferred format: `<type>(<scope>): <summary>`
- examples:
  - `chore(gate): add task-branch commit policy`
  - `feat(gateway): add route registry reader`
  - `test(project-core): cover draft validation`

PR rule:

- `gh pr create` is not part of the allowed workflow
- `./scripts/codex-safe-gh.sh` explicitly rejects PR creation

Allowed categories:

- status
- diff
- add
- commit
- branch
- switch
- worktree

Forbidden by default:

- force push
- destructive history rewrite
- direct protected-branch push
- pull request creation

## Runtime/tooling policy

- use `Node`
- use `node --import tsx` for development execution
- use `corepack pnpm` as the package manager entrypoint
- use `turbo` for workspace orchestration
- do not migrate the project to `Bun` in V1
- do not add compatibility shims for other runtimes or package managers
- target the pinned runtime exactly

## Project scope policy

V1 supports:

- first-party managed projects only
- `static` projects
- `dynamic` projects

V1 does not support:

- arbitrary third-party GitHub project deployment
- executing untrusted external repositories as managed runtime workloads

## Port and runtime policy

- one public port only
- route by path prefix
- do not open extra public ports directly
- do not expose project files directly under `/static/<slug>`
- use `/p/<slug>` for static projects
- use `/app/<slug>` and `/api/runtime/<slug>` for dynamic projects
- dev route registrations are stored in `storage/route-registry/dev-routes.json`
- do not hand-edit the registry file

If a dev route needs to be exposed, use:

```bash
./scripts/register-dev-route.sh /app/demo internal-handler demo-runtime
```

If a new managed project needs to be created in the formal content repo, use:

```bash
node --import tsx scripts/create-project.ts --slug demo-static --name "Demo Static" --runtime static
```

If write APIs are exercised locally, set:

```bash
export PROJECT_MANAGER_ADMIN_TOKEN=your-local-admin-token
```

Then send:

```text
Authorization: Bearer <token>
```

for control-plane mutations.

For one-command local startup, use:

```bash
./scripts/dev-up.sh
```

This helper installs dependencies on first run, defaults the local admin token if needed, waits for the local health check, and starts the gateway on `127.0.0.1:3100`.

If generated local artifacts need to be cleaned, use repository cleanup scripts instead of ad hoc `rm` commands.

Examples:

```bash
corepack pnpm clean:web
corepack pnpm clean:generated
```

## Development behavior policy

Codex should:

- keep changes narrow
- avoid unrelated refactors
- update docs when rules change
- add or update tests for changed behavior
- keep implementation aligned with the quality gate
- do not add speculative compatibility branches
- treat the frontend rebuild as a multi-route Vue application, not a monolithic single-screen shell
- rerun the quality gate after every code update during frontend work, not only at the end of a large batch
