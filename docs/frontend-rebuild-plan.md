# Frontend Rebuild Plan

## Decision

The current control plane UI is a transitional shell only.

It is not the target frontend architecture for V1.

The formal frontend rebuild must use:

- `Vue 3`
- `TypeScript`
- `Vite`
- `Vue Router`
- `Pinia`
- `Vitest`
- `Playwright`

Do not continue expanding the current string-built single-screen control plane as the long-term UI.

## UI shape

The frontend must be a route-based multi-view application.

It may ship as a single browser bundle, but it must not behave like one giant page that tries to expose every workflow at once.

Required top-level views:

- `/projects`
- `/projects/:slug`
- `/projects/:slug/workspace`
- `/projects/:slug/versions`
- `/projects/:slug/ai`

Required behavior:

- each route has one primary job
- navigation must preserve project context
- desktop layouts may use split panes
- mobile layouts must collapse into a single-column flow
- the file editor must not be forced into the same viewport as versions and AI task review on small screens

## Component model

The rebuild must use component boundaries instead of a monolithic DOM controller.

Required frontend structure:

- route views own page-level data loading
- reusable UI components stay presentation-focused
- API clients stay outside view components
- editor, version, and AI task workflows must be split into separate feature areas

Minimum route/view breakdown:

- `ProjectsIndexView`
- `ProjectOverviewView`
- `ProjectWorkspaceView`
- `ProjectVersionsView`
- `ProjectAiTasksView`

Minimum shared component breakdown:

- `ProjectList`
- `ProjectHeader`
- `ProjectMetaCard`
- `WorkspaceTree`
- `FileEditorPanel`
- `VersionList`
- `VersionDiffPanel`
- `AiTaskList`
- `AiTaskSummaryPanel`

## Styling rule

The visual direction should follow the neutral + teal reference already captured in `reference/index.html`.

Default styling choice:

- design tokens in application CSS
- hand-authored layout CSS
- component-scoped styles when useful

Do not add `Tailwind CSS` by default for the rebuild.

Reason:

- the first problem is information architecture, not utility-class speed
- route views and component boundaries should be stabilized before introducing another styling abstraction
- a small, intentional design token system is easier to govern during the rebuild

Tailwind can be reconsidered only if the rebuilt app starts accumulating repetitive utility-heavy layout work that is clearly slowing development.

## Mobile rule

Mobile support is a hard requirement for the rebuilt frontend.

The current shell only has baseline responsive collapse. That is not enough.

The rebuilt app must explicitly cover:

- narrow-screen navigation
- touch-sized controls
- stacked forms
- stacked AI task review
- non-destructive file navigation on small screens
- readable diff and summary presentation without horizontal overflow as the default experience

## Immediate build priority

Before broad frontend feature work resumes, the rebuild must first formalize linting and test gates for the new app.

That work should be done before large UI implementation slices.

Required frontend gate shape:

1. framework app bootstrap
2. frontend lint
3. frontend typecheck
4. frontend unit/component tests
5. frontend route smoke coverage
6. mobile smoke coverage for critical paths

## Required frontend gate

The rebuilt frontend must add or extend the repository gate with:

- `ESLint` for `.ts` and `.vue`
- `vue-tsc` or equivalent strict Vue typecheck
- `Vitest` for route, store, and component behavior
- `Vue Test Utils` for component interaction coverage
- `Playwright` for route smoke on desktop and mobile viewport presets

Minimum enforced frontend checks:

- no unused state or props
- no implicit `any`
- no unhandled async navigation errors
- no giant page components that mix unrelated workflows
- no route without smoke coverage
- no critical project workflow without either component coverage or smoke coverage

## Post-change rule

After every code update, run the repository quality gate.

Canonical command:

```bash
./scripts/run-quality-gate.sh
```

When the Vue/Vite app lands, its frontend-specific lint and test commands must be wired into that root gate instead of being treated as optional local commands.

## Migration phases

1. document the target architecture and gate
2. bootstrap the framework app and route shell
3. add frontend lint/typecheck/unit/smoke lanes
4. move project overview and navigation into the new app
5. move workspace, versions, and AI task flows into dedicated routes
6. delete the temporary monolithic control-plane shell
