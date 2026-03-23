# Current UI Review

## Purpose

This document records the current control-plane UI problems observed in the existing `apps/web` implementation.

It is not a future-state design spec.

It is an audit of the current shipped management UI so the next frontend work can prioritize the right problems.

## Scope

Reviewed routes:

- `/projects`
- `/projects/:slug`
- `/projects/:slug/workspace`
- `/projects/:slug/versions`
- `/projects/:slug/ai`

Reviewed states:

- public visitor flow
- admin-enabled management flow
- desktop viewport
- mobile narrow-screen viewport

Primary evidence came from:

- direct runtime inspection of the current UI
- current route and shell implementation in `apps/web/src/app/*`
- current frontend rebuild policy in `docs/frontend-rebuild-plan.md`

## Summary

The current UI is functional as a transitional operator shell, but it has major problems in four areas:

1. management entry and access-state handling
2. modal and navigation accessibility
3. mobile workflow usability
4. information architecture inside workspace, versions, and AI review

The core issue is not visual polish.

The core issue is that the current shell still behaves like a thin developer-facing control surface while it is already carrying product-level workflows.

That mismatch is already acknowledged in the formal rebuild plan:

- the current control plane is transitional only
- the rebuild must be route-based
- mobile support is a hard requirement
- baseline responsive collapse is not enough

## Severity Levels

### Critical

These problems block safe or reliable use of the UI.

### Major

These problems do not fully block use, but they damage flow, clarity, or review quality in important paths.

### Moderate

These problems are not immediate blockers, but they create friction, reduce trust, or make the UI harder to expand cleanly.

## Findings

### Critical: Admin access can fail into a dead-end state

Observed behavior:

- when the gateway is running without `PROJECT_MANAGER_ADMIN_TOKEN`, the global access modal remains available
- entering a token can produce a raw `auth-not-configured` error
- the UI does not explain what this means or what to do next

Why this is a problem:

- the user is invited into a management flow that the backend cannot actually support
- the error is a backend code, not a user-facing explanation
- there is no recovery path beyond closing the modal

Current implementation areas:

- `apps/web/src/app/project-manager-shell.ts`
- `apps/web/src/gateway-api.ts`

Required direction:

- detect and explain auth configuration failures in user language
- disable or downgrade management entry when admin auth is unavailable
- separate “invalid token” from “server not configured for admin mode”

### Critical: Modal behavior is incomplete and not accessible enough

Observed behavior:

- the access modal and create-project modal use visual overlays only
- there is no clear focus trap
- there is no documented escape-key handling
- there is no backdrop-click dismissal
- the background remains present under the modal

Why this is a problem:

- keyboard users can lose context
- assistive technology gets weaker dialog semantics than expected
- the UI looks modal but does not fully behave like one

Current implementation areas:

- `apps/web/src/app/project-manager-shell.ts`
- `apps/web/src/app/project-manager-projects-render.ts`
- `apps/web/src/app/project-manager-shell-base-styles.ts`

Required direction:

- use complete modal behavior, not only modal styling
- add labeled dialog semantics
- trap focus while open
- support explicit keyboard dismissal where safe
- make background content inert while modal is active

### Critical: Mobile support is still “collapsed desktop”, not mobile workflow design

Observed behavior:

- the current UI mostly switches flex and grid layouts into single-column mode
- page headers remain tall and repetitive on small screens
- workspace still stacks tree, file actions, editor, and save control into one long scroll flow
- the editor remains the dominant block even when navigation and file context should come first

Why this is a problem:

- small-screen usage becomes scroll-heavy and brittle
- file navigation and editing compete in the same viewport
- the user has to traverse too much repeated header structure before reaching useful controls

This directly violates the formal rebuild rule:

- “baseline responsive collapse” is not enough
- mobile must support narrow-screen navigation, stacked forms, stacked AI review, and non-destructive file navigation

Current implementation areas:

- `apps/web/src/app/project-manager-view-shared.ts`
- `apps/web/src/app/project-manager-workspace-render.ts`
- `apps/web/src/app/project-manager-shell-base-styles.ts`
- `apps/web/src/app/project-manager-shell-component-styles.ts`
- `docs/frontend-rebuild-plan.md`

Required direction:

- define mobile-first route behavior, not only smaller CSS grids
- reduce header weight on narrow screens
- separate file selection from file editing more deliberately
- make save and destructive actions visible without forcing excessive scroll

### Major: Route headers are too heavy and repetitive

Observed behavior:

- project routes render breadcrumb, title, description, action button, current-view badge, and tab row together
- the same route identity is shown multiple times in the same header block
- on mobile, the badge and tab row together consume too much vertical space

Why this is a problem:

- content starts too low on the page
- route context is over-explained instead of clarified
- the header competes with the actual working surface

Current implementation area:

- `apps/web/src/app/project-manager-view-shared.ts`

Required direction:

- keep one clear primary route identity element
- remove redundant current-view signaling
- let route-specific content start earlier

### Major: Project list information design is inconsistent between public and admin modes

Observed behavior:

- public cards show only a minimal route-facing summary
- admin rows expose raw fields like `slug`, `route`, and `entry` as inline strings
- action wording such as `open page ->` and `entry: ... ->` reads like internal tooling, not intentional UI copy

Why this is a problem:

- public mode hides useful decision context
- admin mode exposes raw internals without structuring them into clear metadata groups
- the UI oscillates between oversimplified and overly raw

Current implementation area:

- `apps/web/src/app/project-manager-projects-render.ts`

Required direction:

- define one clear project-card information model per mode
- group metadata intentionally
- replace placeholder-style copy with action labels that describe outcome

### Major: Version review is too shallow for a destructive restore workflow

Observed behavior:

- snapshot detail shows only changed-file count and a list of `added`, `deleted`, or `modified` paths
- the restore action is exposed right next to that minimal summary
- there is no deeper content diff in the current UI

Why this is a problem:

- restore is a high-risk action
- file-level change names are often not enough for confident review
- the UI encourages restore with weak inspection support

Current implementation areas:

- `apps/web/src/app/project-manager-versions-view.ts`
- `apps/web/src/gateway-api-models.ts`
- `packages/git-core/src/project-version-diff.ts`

Required direction:

- increase review depth before restore
- clearly distinguish low-confidence review from high-confidence review
- avoid pairing destructive actions with underpowered inspection

### Major: AI session detail is readable only while the task stays small

Observed behavior:

- session view renders long task content, event output, stdout, stderr, and change summary in one vertical card sequence
- completed tasks can dump large generated content directly into the route
- the layout has little summarization before raw detail

Why this is a problem:

- the page becomes log-heavy very quickly
- operator scanning is slower than it should be
- mobile review quality drops faster than desktop review quality

Current implementation areas:

- `apps/web/src/app/project-manager-ai-render.ts`
- `apps/web/src/app/project-manager-ai-task-details.ts`
- `apps/web/src/app/project-manager-shell-component-styles.ts`

Required direction:

- lead with session summary, status, and changed-files summary
- progressively disclose raw logs and raw AI output
- keep the task-review path readable before exposing full artifacts

### Moderate: Touch target sizing is too small for a management UI

Observed behavior:

- major button and link controls use `min-height: 32px`

Why this is a problem:

- this is small for touch interaction
- management UIs use repeated high-precision interactions
- the issue becomes more obvious on mobile routes

Current implementation areas:

- `apps/web/src/app/project-manager-shell-component-styles.ts`

Required direction:

- raise touch-target sizes for primary interactive controls
- verify narrow-screen control spacing with actual smoke coverage

### Moderate: The current visual language is serviceable but not intentional enough

Observed behavior:

- the UI is coherent, but generic
- many controls and cards share nearly identical visual treatment
- hierarchy depends heavily on text weight rather than stronger layout decisions

Why this is a problem:

- scan speed drops on long list and detail views
- workflows feel closer to an internal debug tool than a productized control plane
- it is harder to tell primary actions from supporting structure

Current implementation areas:

- `apps/web/src/app/project-manager-shell-base-styles.ts`
- `apps/web/src/app/project-manager-shell-component-styles.ts`

Required direction:

- strengthen hierarchy through layout and spacing, not only heavier text
- make action groups more distinct
- make content sections easier to scan at distance

## Structural Cause

The current UI problems are not isolated bugs.

They mostly come from one structural reality:

- the repository has already moved to route-based views
- but many route surfaces still behave like a thin hand-built admin shell
- the shell is therefore too heavy for navigation and too shallow for workflow-specific review

This is why the formal rebuild plan correctly prioritizes:

1. route ownership
2. component boundaries
3. lint and test gates
4. dedicated workspace, versions, and AI feature areas

## Priority Order

Recommended order for follow-up work:

1. fix admin-access failure states and modal behavior
2. define narrow-screen navigation and mobile route rules
3. simplify page-header structure across project routes
4. redesign workspace mobile flow before adding more editor features
5. deepen version-review and AI-review information architecture
6. refine project list metadata and action copy

## Non-Goals

This review does not claim that the current UI is unusable.

It claims that the current UI should not be treated as a stable long-term frontend shape.

That conclusion matches the existing documented rebuild policy.

## Status

This document reflects the current UI behavior observed during direct review of the existing `apps/web` implementation.
