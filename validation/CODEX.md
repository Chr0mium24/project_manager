# Codex Guide For Validation Workspace

This directory is a controlled validation-only workspace for the future project manager.

## Objective

When working here, Codex must follow the workspace rules and prefer script-driven changes over manual file edits.

## Required rules

1. Treat `content-repo/` as the managed content repository
2. Do not create project directories by hand
3. Use `node scripts/create-project.mjs` for any new project creation
4. Keep project shape consistent with `project.json` and `projects-index.json`
5. Run these checks after any structural change:
   - `npm test`
   - `npm run validate`
6. Do not touch unrelated projects when asked to operate on one target project

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
