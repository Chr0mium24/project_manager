# Codex Guide For Validation Workspace

This directory is a controlled validation-only workspace for the future project manager.

## Objective

When working here, Codex must follow the workspace rules and prefer script-driven changes over manual file edits.

## Required rules

1. Treat `content-repo/` as the managed content repository
2. Do not create project directories by hand
3. Use `node scripts/create-project.mjs` for any new project creation
4. Keep project shape consistent with `project.json` and `projects-index.json`
5. Use `node scripts/start-managed-task.mjs` to start a managed-project task workspace
6. One managed-project task targets one project by default
7. Run these checks after any structural change:
   - `npm test`
   - `npm run validate`
8. Do not touch unrelated projects when asked to operate on one target project
9. The main repository's one-slice-one-commit rule does not apply inside this validation workspace
10. If a managed-project task later becomes Git-backed, prefer one final result commit, not many intermediate commits
11. Do not create PRs for managed-project tasks

## Project model

Projects are split into two runtimes:

- `static`
  - Route prefix: `/p/<slug>`
  - Default entry: `src/index.html`
- `dynamic`
  - Route prefix: `/app/<slug>`
  - Default entry: `src/server.ts`

## Bootstrap commands

Static project:

```bash
node scripts/create-project.mjs --content-repo ./content-repo --slug demo-static --name "Demo Static" --runtime static
```

Dynamic project:

```bash
node scripts/create-project.mjs --content-repo ./content-repo --slug demo-service --name "Demo Service" --runtime dynamic
```

Managed-project task workspace:

```bash
node scripts/start-managed-task.mjs --content-repo ./content-repo --project landing-a --task fix-copy --mode workspace
```

Apply managed-project task result:

```bash
node scripts/apply-managed-task.mjs --content-repo ./content-repo --project landing-a --task fix-copy
```

## Debug server

Run:

```bash
npm run dev
```

Default routes:

- `GET /healthz`
- `GET /api/projects`
- `GET /api/projects/:slug`
- `GET /p/:slug` for static projects
- `GET /app/:slug` for dynamic project debug metadata

## Expected behavior

If instructed to create a project, Codex should:

1. Read this file
2. Use the bootstrap script
3. Avoid manual index edits
4. Re-run validation if requested

If instructed to modify one managed project, Codex should:

1. Start a managed-project task workspace
2. Keep the task scoped to the single requested project
3. Avoid PR-oriented workflow
4. Apply the validated end result back through the apply script when requested
