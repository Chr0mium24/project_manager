# Managed Project Codex Workflow

## Scope

This document applies to managed projects operated on by the platform.

It does not define the commit cadence for the `project_manager` repository itself.

The main repository follows the stricter workflow in:

- `CODEX.md`
- `docs/codex-development.md`
- `docs/sandbox-and-git.md`

## Rule

Codex may modify managed projects, but the managed-project workflow is different from the main repository workflow.

The goal is:

- isolate each task to one target project
- avoid touching the managed project's mainline directly
- avoid PR noise
- commit the final result when the task is complete

## Default managed-project flow

1. identify the single target project
2. operate in an isolated task workspace or task branch for that project
3. make the required file changes
4. run the project's required validation
5. present the diff or result summary
6. apply the validated result back to the target project through an explicit step
7. create one result commit if the managed project uses Git-backed task branches
8. stop without creating a PR

Formal task bootstrap helper:

```bash
node --import tsx scripts/start-managed-task.ts --project landing-a --task fix-copy --mode workspace
```

Formal summary helper:

```bash
node --import tsx scripts/summarize-managed-task.ts --project landing-a --task fix-copy
```

Formal validation helper:

```bash
node --import tsx scripts/validate-managed-task.ts --project landing-a --task fix-copy
```

Formal apply helper:

```bash
node --import tsx scripts/apply-managed-task.ts --project landing-a --task fix-copy
```

## Important distinction

For managed projects:

- do not commit every intermediate step
- do not require one commit per tiny edit
- do not create a PR by default

The commit cadence rule from the main repository does not apply here.

Instead:

- keep intermediate edits local to the task workspace
- commit once when the task outcome is complete and validated
- apply the validated workspace back to the target project through an explicit step

Formal V1 status:

- formal `start-managed-task` now lives in `packages/project-core`
- formal `summarize-managed-task` now lives in `packages/project-core`
- formal `validate-managed-task` now lives in `packages/project-core`
- formal `apply-managed-task` now lives in `packages/project-core`
- formal `POST /api/ai/tasks` now enqueues `start -> codex exec -> summarize -> validate`
- the formal AI control-plane flow stops at a validated workspace and does not auto-apply
- formal AI task status now transitions through `queued -> running -> completed|failed`
- control-plane clients must poll `GET /api/ai/tasks/:taskId` before calling `summary` or `apply`

## Branch rule

If the managed project is Git-backed:

- use a task branch
- do not commit on the managed project's main branch
- do not rewrite history
- do not create a PR unless the user explicitly changes the policy later

## Non-Git-managed projects

If the managed project is currently handled as files, drafts, or generated content without its own Git workflow:

- keep changes in the managed workspace or draft layer
- validate the result
- let the platform decide when to persist or publish

In that case, there may be no project-level commit at all.

## Validation rule

Always use the validation method defined for that managed project type.

Examples:

- content repo structure checks
- schema validation
- route validation
- project-specific smoke checks

## Hard rule

One target project per task unless the task explicitly states otherwise.

Do not spread one Codex task across many managed projects by default.
