# Development Architecture

## Principle

Build the product as a modular monorepo with strict service boundaries.

Do not start with many distributed services.

Instead:

- define modules as if they were microservices
- keep contracts explicit
- keep implementations extractable
- keep deployment simple until proven necessary

## Required modules

### `web-app`

Responsibilities:

- project list
- project editor
- static preview
- AI task panel
- publish actions

Must not:

- call GitHub directly
- execute Git commands
- invoke Codex directly

### `gateway-api`

Responsibilities:

- frontend-facing API
- auth/session layer
- request validation
- routing requests to internal modules

Must not:

- own Git logic
- own Codex orchestration logic

### `project-service`

Responsibilities:

- project metadata
- file tree reads
- file updates
- draft state
- project creation flow

Must not:

- publish directly
- call Codex directly

### `git-service`

Responsibilities:

- commit
- branch
- tag
- push
- content repo history queries

### `publish-service`

Responsibilities:

- runtime-aware publish logic
- static publish flow
- dynamic publish flow

### `ai-orchestrator`

Responsibilities:

- build Codex task context
- constrain file scope
- run scripted operations
- capture logs, summaries, diffs

### `test-orchestrator`

Responsibilities:

- enforce the test gate
- coordinate unit/integration/contract/e2e checks
- block incomplete feature rollout

## Feature boundary rule

A new feature should touch at most:

- one frontend module
- one backend module
- one shared package

If more is needed:

- split the work
- write an architecture note first

## Feature implementation protocol

Every feature should be delivered as a vertical slice.

The expected order is:

1. define or update the contract
2. add or update tests
3. implement the smallest working backend change
4. implement the smallest working frontend change
5. run the quality gate

Do not implement a large cross-system feature as one undifferentiated change.

## Dependency direction

Allowed direction:

- `apps/*` may depend on `packages/*`
- feature packages may depend on contracts and lower-level core packages

Forbidden direction:

- core packages depending on apps
- project logic depending on UI logic
- AI modules depending on UI internals
- circular dependencies between packages

## Service extraction rule

Start modular, extract later.

Extract a module into a standalone service only when at least one of these is true:

- scaling needs differ materially
- deployment cadence differs materially
- security isolation is required
- runtime requirements differ
- failure isolation becomes necessary

Do not extract a service only because the codebase is growing.

## Architecture record rule

An architecture note is required when:

- a feature touches more than one frontend module and one backend module
- a dependency boundary must be crossed
- a new shared package is introduced
- a new external service is added
- a quality rule needs temporary relaxation

## Monorepo target shape

```text
apps/
  web/
  gateway/
  ai-worker/
  test-runner/
packages/
  contracts/
  project-core/
  git-core/
  publish-core/
  ai-core/
  preview-core/
  testkit-core/
  testkit-vitest/
  testkit-playwright/
  testkit-contract/
```

## Hard rule

No module may read another module's private implementation files directly.

Cross-module access must happen through:

- contracts
- public interfaces
- service APIs
