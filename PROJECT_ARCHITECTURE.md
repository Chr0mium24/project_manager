# Project Manager Architecture

## 1. Project Goal

Build a local-first project manager for many small web projects.

Constraints:

- Each managed project is small, usually `1-5` files
- There may be `10+` projects, with `2-3` new projects per day
- Source files should be stored in Git and pushed to GitHub
- The system must support project-level management, not only single HTML files
- The frontend must stay lightweight and support in-browser editing and preview
- The system must integrate Codex locally for `create_project` and `fix_bug`
- New features must be isolated as much as possible
- No new feature is allowed to land unless the test framework passes
- The test framework itself must be modular and extensible

## 2. Key Decisions

### 2.1 Content storage

Use `one large Git repository` for managed project content, not submodules and not one `.git` per project.

Reason:

- Project creation is cheaper
- Unified GitHub sync is simpler
- Codex can operate on a target project directory
- The control plane stays simpler

Managed content repository shape:

```text
content-repo/
  projects/
    project-a/
      project.json
      src/
        index.html
        app.js
        styles.css
    project-b/
      project.json
      src/
        index.html
  projects-index.json
```

### 2.2 Product codebase

Use `one monorepo` for the platform itself.

Recommended stack:

- Package manager: `pnpm`
- Build orchestration: `turbo`
- Frontend: `Vue 3 + Vite + TypeScript + Pinia + Monaco`
- Backend services: `TypeScript`
- HTTP framework: `Fastify`
- Validation/schema: `zod`
- Testing: `Vitest + Playwright`
- Codex integration: `Codex SDK` first, `Codex CLI` as fallback

### 2.3 Service strategy

Do not start with physically separate deployables for everything.

Start as a `modular monorepo` with strict service boundaries and separate processes where needed. Each service must be independently testable and later extractable into a real microservice.

This avoids early distributed-system overhead while preserving microservice boundaries.

### 2.4 Database strategy

V1 default: `no business database for project content`.

Use:

- Git repo for official project source and history
- `project.json` for per-project metadata
- `projects-index.json` for the global index

Optional later:

- Add `SQLite` behind a `StateStore` interface only when AI task state, audit logs, or multi-user coordination require it

## 3. Development Principles

### 3.1 Feature isolation

Every new feature must be a small vertical slice with minimal coupling.

Rules:

- One feature should touch at most:
  - one frontend module
  - one backend service
  - one shared package
- If a feature requires cross-cutting changes in many services, split it into smaller phases
- Shared package changes must remain generic and not contain feature-specific business logic
- No service may directly read another service's private files
- Cross-service interaction must happen through contracts

### 3.2 Test-first gate

No feature can be merged or marked complete unless all required tests pass.

Required gate:

1. Lint passes
2. Typecheck passes
3. Unit tests pass
4. Service integration tests pass
5. Contract tests pass
6. End-to-end smoke tests pass
7. Changed-package coverage threshold passes

### 3.3 Contract-first changes

Before changing behavior across service boundaries:

1. Update the contract
2. Update contract tests
3. Update producer implementation
4. Update consumer implementation

## 4. Target Architecture

## 4.1 Logical modules

The platform is split into six bounded modules.

### A. `web-app`

Responsibility:

- Project list
- Project editor
- File tree
- HTML preview
- Version history view
- AI task panel
- Publish actions

Must not:

- Talk to GitHub directly
- Run Git commands
- Call Codex directly

### B. `gateway-api`

Responsibility:

- Public API for frontend
- Request validation
- Session/auth layer
- Delegation to backend services

Must not:

- Embed Git logic
- Embed Codex loop logic
- Own content-repo state directly

### C. `project-service`

Responsibility:

- Project CRUD
- File tree read/write
- `project.json` handling
- `projects-index.json` maintenance
- Draft save/load
- Version metadata view

Must not:

- Push to GitHub by itself
- Run Codex by itself

### D. `git-service`

Responsibility:

- Git working tree operations
- Commit
- Branch
- Tag
- Push to GitHub
- Per-project history queries

Must not:

- Interpret product-level business logic

### E. `ai-orchestrator`

Responsibility:

- Create AI tasks
- Build task context
- Limit file scope to target project directory
- Call Codex SDK
- Fall back to Codex CLI if needed
- Produce patches, logs, summaries

Supported task types in V1:

- `create_project`
- `fix_bug`
- `refactor_file`
- `explain_change`

Must not:

- Write directly to production content without confirmation

### F. `test-orchestrator`

Responsibility:

- Execute validation pipeline
- Build test fixtures
- Run package-level and cross-package checks
- Block feature promotion when tests fail

## 4.2 Runtime topology

V1 recommended processes:

1. `web-app`
2. `gateway-api`
3. `ai-worker`
4. `test-runner`

Optional separate process later:

5. `git-service`

In V1, `project-service` and `git-service` may live as internal modules inside `gateway-api`, but they must still expose clear internal contracts and test boundaries.

## 5. Recommended Repository Layout

```text
project-manager/
  apps/
    web/
    gateway/
    ai-worker/
    test-runner/
  packages/
    contracts/
    shared-config/
    project-core/
    git-core/
    ai-core/
    preview-core/
    testkit-core/
    testkit-vitest/
    testkit-playwright/
    testkit-contract/
    testkit-git-fixture/
    testkit-ai-fixture/
  content-repo/
    projects/
    projects-index.json
  docs/
    adr/
    api/
  turbo.json
  pnpm-workspace.yaml
```

## 6. Core Contracts

Put all shared contracts in `packages/contracts`.

Suggested contract groups:

- `project-contracts`
- `file-contracts`
- `version-contracts`
- `ai-task-contracts`
- `test-report-contracts`

Examples:

- `CreateProjectRequest`
- `UpdateProjectFileRequest`
- `PublishProjectRequest`
- `CreateAiTaskRequest`
- `AiTaskStatusResponse`
- `TestRunSummary`

Rule:

- Frontend imports only contracts, not backend internals
- Services communicate through contract packages, not shared implementation

## 7. Content Model

The managed content repository is a product-level contract. The directory shape, naming rules, and metadata schema must be stable and testable.

## 7.1 `content-repo/` directory specification

Required layout:

```text
content-repo/
  projects/
    <project-slug>/
      project.json
      src/
        ...
      assets/
        ...
      drafts/
        ...
  projects-index.json
```

Rules:

- All managed projects must live under `content-repo/projects/`
- Each project directory name must equal the project `slug`
- Each project directory must contain exactly one `project.json`
- `src/` contains source files that are part of the official project content
- `assets/` is optional and contains static assets
- `drafts/` is optional in V1 and stores unpublished local work products
- `projects-index.json` is the only global index file

Forbidden:

- Nested project directories
- Extra global index files
- Per-project `.git` directories
- Project names that differ from directory slug

## 7.2 Project slug rules

Project slug is the stable primary identifier at the content layer.

Rules:

- Lowercase only
- Characters allowed: `a-z`, `0-9`, `-`
- Must start with a letter or digit
- Must not end with `-`
- Length: `3-64`
- Must be unique inside `content-repo/projects/`

Regex:

```text
^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$
```

## 7.3 `project.json` contract

Each managed project must contain a `project.json`.

Required fields:

- `schemaVersion`
- `name`
- `slug`
- `runtime`
- `entry`
- `route`
- `visibility`
- `createdAt`
- `updatedAt`

Optional fields:

- `description`
- `tags`
- `latestVersion`
- `mainLanguage`
- `framework`
- `owner`

Supported `runtime` values in V1:

- `static`
- `dynamic`

Supported `visibility` values in V1:

- `private`
- `unlisted`

Example:

```json
{
  "schemaVersion": 1,
  "name": "Landing A",
  "slug": "landing-a",
  "description": "Marketing landing page",
  "runtime": "static",
  "entry": "src/index.html",
  "route": "/p/landing-a",
  "visibility": "private",
  "tags": ["landing", "promo"],
  "latestVersion": "v3",
  "mainLanguage": "html",
  "framework": "vanilla",
  "owner": "local",
  "createdAt": "2026-03-19T00:00:00.000Z",
  "updatedAt": "2026-03-19T00:00:00.000Z"
}
```

## 7.4 `project.json` JSON Schema

The validation workspace must enforce this schema.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "project.schema.json",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "name",
    "slug",
    "runtime",
    "entry",
    "route",
    "visibility",
    "createdAt",
    "updatedAt"
  ],
  "properties": {
    "schemaVersion": {
      "type": "integer",
      "const": 1
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "slug": {
      "type": "string",
      "pattern": "^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$"
    },
    "description": {
      "type": "string",
      "maxLength": 500
    },
    "runtime": {
      "type": "string",
      "enum": ["static", "dynamic"]
    },
    "entry": {
      "type": "string",
      "pattern": "^src\\/.+"
    },
    "route": {
      "type": "string",
      "pattern": "^\\/[A-Za-z0-9._\\/-]+$"
    },
    "visibility": {
      "type": "string",
      "enum": ["private", "unlisted"]
    },
    "tags": {
      "type": "array",
      "maxItems": 16,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 32
      },
      "uniqueItems": true
    },
    "latestVersion": {
      "type": "string",
      "minLength": 1,
      "maxLength": 64
    },
    "mainLanguage": {
      "type": "string",
      "maxLength": 32
    },
    "framework": {
      "type": "string",
      "maxLength": 32
    },
    "owner": {
      "type": "string",
      "maxLength": 64
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

## 7.5 `projects-index.json` contract

Global project index:

```json
{
  "version": 1,
  "generatedAt": "2026-03-19T00:00:00.000Z",
  "projects": [
    {
      "slug": "landing-a",
      "path": "projects/landing-a",
      "name": "Landing A",
      "runtime": "static",
      "visibility": "private",
      "entry": "src/index.html",
      "route": "/p/landing-a",
      "updatedAt": "2026-03-19T00:00:00.000Z"
    }
  ]
}
```

Rules:

- `version` is currently `1`
- `generatedAt` must be valid ISO datetime
- `projects` must be sorted by `slug`
- `projects[].path` must equal `projects/<slug>`
- `projects[].slug` must match the `project.json` slug
- `projects[].runtime` must match the `project.json` runtime
- `projects[].entry` must match the `project.json` entry
- `projects[].route` must match the `project.json` route
- The index must not contain a project missing on disk
- A project on disk must not be missing from the index

## 7.6 Draft handling rule

V1 draft rule:

- Official source remains under `src/`
- Temporary unpublished content may live under `drafts/`
- Draft files must never be treated as publishable entry files
- `project.json.entry` must never point into `drafts/`

## 7.7 Runtime rules

The product UI may present both as "projects", but runtime behavior must split into exactly two classes in V1.

### `runtime = static`

Rules:

- Published output is a frontend route
- Default route prefix: `/p/<slug>`
- `entry` should normally be `src/index.html`
- Preview is served as static content

### `runtime = dynamic`

Rules:

- Published output is an application or service route
- Default route prefix: `/app/<slug>`
- `entry` points to a runtime entry file such as `src/main.ts` or `src/server.ts`
- Preview may require a backend runtime

## 7.8 Project bootstrap script

Project creation must be script-driven.

Do not create project directories by hand.

Reasons:

- Prevent schema drift
- Keep routes and slugs consistent
- Keep `projects-index.json` synchronized
- Allow future template selection and Codex integration

Minimum script responsibilities:

1. Validate `slug`
2. Validate `runtime`
3. Create project directory
4. Create `project.json`
5. Create starter files under `src/`
6. Update `projects-index.json`
7. Refuse overwrite unless explicitly forced

## 8. Git and GitHub Workflow

### 8.1 Standard project update

1. Frontend edits files through `project-service`
2. Draft changes are written into the target project directory
3. User requests publish
4. `git-service` creates commit
5. `git-service` pushes to GitHub
6. `project-service` updates `latestVersion` and index metadata

### 8.2 AI-assisted update

1. Frontend creates AI task
2. `ai-orchestrator` checks task type and target project
3. `ai-orchestrator` limits context to target directory
4. Codex proposes changes
5. Changes are written to a patch or draft workspace
6. `test-orchestrator` runs required checks
7. Only after passing tests can changes be promoted to publish flow

### 8.3 Forbidden operations

- Frontend direct GitHub writes
- Frontend storing GitHub write token
- AI direct write to main branch without explicit confirmation
- Cross-project mutation in one AI task unless explicitly approved

## 9. Testing Framework Architecture

The testing system is a first-class module, not an afterthought.

## 9.1 Goals

- Every feature change is gated by tests
- The framework can expand without rewriting the core runner
- Test fixtures for Git, AI, and project content are reusable

## 9.2 Test framework modules

### `testkit-core`

Responsibility:

- Common runner interfaces
- Test lifecycle hooks
- Shared fixture APIs
- Result aggregation

Core interfaces:

- `TestPlugin`
- `TestSuiteDefinition`
- `FixtureProvider`
- `TestReport`
- `GateDecision`

### `testkit-vitest`

Responsibility:

- Unit test plugin
- Library and service-level tests

### `testkit-playwright`

Responsibility:

- Browser smoke tests
- Editor flow tests
- Preview tests

### `testkit-contract`

Responsibility:

- API contract tests
- Consumer/provider compatibility checks

### `testkit-git-fixture`

Responsibility:

- Temporary repo creation
- Commit history fixtures
- Branch and tag fixtures

### `testkit-ai-fixture`

Responsibility:

- Fake Codex adapter
- Deterministic AI task replay
- Snapshot verification of patches and summaries

## 9.3 Test pipeline

Every feature branch must pass this pipeline:

1. `format:check`
2. `lint`
3. `typecheck`
4. `test:unit`
5. `test:integration`
6. `test:contract`
7. `test:e2e:smoke`

If the change touches AI or Git logic, also run:

8. `test:ai`
9. `test:git-fixtures`

## 9.4 Feature gate policy

A feature is blocked if any of the following is true:

- The affected module has failing tests
- The changed contract lacks updated tests
- E2E smoke for impacted flow is missing
- AI patch output is not deterministic enough for review
- A feature modifies more than the allowed module count without an approved architecture note

## 9.5 Test extensibility rule

Any new test type must be added as a plugin under `packages/testkit-*`.

Do not hardcode test-type logic into the main runner.

## 10. Verification Checklist

These items must be run and confirmed before heavy implementation begins.

### 10.1 Codex

- Verify local `Codex SDK` minimal example works in TypeScript
- Verify `Codex CLI` fallback works in non-interactive mode
- Verify task scope can be limited to a single project directory
- Verify patch extraction and logging are stable enough for review

### 10.2 Git

- Verify single large content repo workflow
- Verify create/edit/commit/push flow for one target project directory
- Verify per-project history query is practical enough
- Verify `projects-index.json` update flow is safe

### 10.3 Frontend

- Verify Monaco editor works with small multi-file projects
- Verify HTML preview isolation strategy
- Verify project switch speed is acceptable

### 10.4 Testing

- Verify `Vitest` package-level tests in monorepo
- Verify `Playwright` smoke flow for project open/edit/preview
- Verify contract test runner can run independently
- Verify git fixture plugin can create disposable repos

## 11. Delivery Plan

## Phase 0: Technical Proof

Goal:

- Prove architecture choices with minimal code

Deliverables:

1. Monorepo skeleton
2. Content repo skeleton
3. Codex SDK spike
4. Codex CLI fallback spike
5. Git fixture tests
6. Basic contract package

Exit criteria:

- Local AI task can read one target project and generate a patch
- Git publish flow works end to end
- Test runner can block bad changes

## Phase 1: Core Project Manager

Goal:

- Build the minimum usable manager

Deliverables:

1. Project list page
2. Project create flow
3. File tree
4. Monaco editor
5. HTML preview
6. Save flow
7. Publish to GitHub
8. Version list page

Exit criteria:

- A user can create, edit, preview, and publish a small project

## Phase 2: AI Integration

Goal:

- Add Codex as controlled workflow automation

Deliverables:

1. AI task panel
2. `create_project`
3. `fix_bug`
4. Diff review
5. Test gate before apply
6. Task logs and summaries

Exit criteria:

- AI can create a new starter project
- AI can patch one existing project under test gate control

## Phase 3: Hardening

Goal:

- Improve maintainability and scale

Deliverables:

1. Project tags and filters
2. Publish history
3. Audit trail
4. More test plugins
5. Architecture decision records
6. Optional `StateStore` abstraction for SQLite

Exit criteria:

- System remains stable as project count grows

## 12. Non-Negotiable Rules

1. No direct frontend access to GitHub write APIs
2. No feature merge without full required test gate
3. No AI direct main-branch mutation
4. No cross-module coupling without contract update
5. No test logic embedded ad hoc inside feature modules
6. No submodules for managed content projects
7. No "just this once" bypass of architecture boundaries

## 13. Immediate Next Actions

1. Create monorepo skeleton with `pnpm` and `turbo`
2. Create `content-repo/` and project metadata schema
3. Implement `contracts` package
4. Implement `testkit-core`
5. Run Codex SDK and CLI proof
6. Build project list and editor MVP
