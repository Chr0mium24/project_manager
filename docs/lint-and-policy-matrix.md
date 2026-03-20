# Lint And Policy Matrix

## Rule

This document lists the code-quality rules that are enforced in the repository today.

If a rule appears here, it is not advisory.

It is either enforced directly by tooling, or enforced indirectly through the root quality gate and commit workflow.

## Enforcement stack

The repository currently enforces code quality in four layers:

1. `Prettier` formatting checks
2. `ESLint` and TypeScript-aware AST rules
3. repository policy scripts in `scripts/check-*.mjs`
4. root quality gate plus tracked `pre-commit` hook

Canonical gate:

```bash
./scripts/run-quality-gate.sh
```

## Rule matrix

| Layer | Entry point | What it enforces | Current hard limits / policy |
| --- | --- | --- | --- |
| Formatting | `npm run format:check` | formatting drift | source must match repository Prettier config |
| ESLint core | `eslint.config.mjs` | JS and TS code-shape limits | file `<= 400` lines, function `<= 80` lines, nesting `<= 3`, complexity `<= 10`, params `<= 4`, statements `<= 20`, sonar cognitive complexity `<= 10` |
| ESLint TypeScript | `eslint.config.mjs` | type-safety and async discipline | no `any`, no floating promises, no `require`, consistent type imports, no shadowing, no unused args unless prefixed with `_` |
| ESLint package rule | `eslint.config.mjs` | package API shape | `packages/*` cannot use default export |
| ESLint restricted syntax | `eslint.config.mjs` | runtime and compatibility bans | no `Bun`, `Deno`, `require()`, `process.versions.node` branching, `node-fetch`, package-manager branching |
| Config presence | `scripts/check-config-presence.mjs` | required repo files and executable scripts | required root files must exist; key scripts and hooks must be executable |
| Doc consistency | `scripts/check-doc-consistency.mjs` | required wording in formal docs | critical architecture and workflow docs must contain exact current policy statements |
| File-size gate | `scripts/check-file-limits.mjs` | repository-wide file length cap | default `<= 400` lines; `scripts/lib/* <= 300` |
| No-compat gate | `scripts/check-no-compat.mjs` | no speculative compatibility code | forbids CommonJS fallback, Bun/Deno branches, node-version branching, `node-fetch`, package-manager compatibility logic |
| Browser API binding gate | `scripts/check-browser-api-bindings.mjs` | frontend browser API safety | forbids storing bare unbound `fetch` references |
| Changed-scope gate | `scripts/check-changed-scope.mjs` | change-slice size discipline | one slice cannot sprawl across too many frontend/backend/shared areas |
| Architecture import gate | `scripts/check-architecture-imports.mjs` | module boundary discipline | no forbidden cross-layer imports; public entrypoints only |
| Dependency graph gate | `scripts/check-dependency-cruiser.mjs` | dependency-direction and cycle rules | dependency-cruiser config must pass |
| Typecheck readiness | `scripts/check-typecheck-readiness.mjs` | pinned toolchain and strict TS baseline | Node `20.19.5`, pnpm `9.15.0`, `strict`, `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `NodeNext` |
| Root typecheck | `npm run typecheck` | actual typed build correctness | current web typecheck must pass |
| Root test lanes | `./scripts/run-quality-gate.sh` | behavior and workflow safety | `test:unit`, `test:integration`, `test:contract`, `test:e2e:smoke`, `test:git`, `test:ai`, `test:publish` all run today |
| Commit gate | `.githooks/pre-commit` and `./scripts/codex-safe-git.sh commit` | commit-time enforcement | no unstaged tracked changes; full gate must pass; gate stamp must match exact snapshot |

## ESLint rule detail

Primary repository lint config lives in [eslint.config.mjs](../eslint.config.mjs).

Important enforced rules:

- `max-lines`
- `max-lines-per-function`
- `max-depth`
- `complexity`
- `max-params`
- `max-statements`
- `sonarjs/cognitive-complexity`
- `import/no-cycle`
- `no-restricted-imports`
- `no-restricted-syntax`
- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-floating-promises`
- `@typescript-eslint/consistent-type-imports`
- `@typescript-eslint/no-unused-vars`

These are hard failures, not warnings.

## Repository policy scripts

The `lint` lane is not only ESLint.

Current `npm run lint` expands to [scripts/check-repo-lint.mjs](../scripts/check-repo-lint.mjs), which runs:

1. `scripts/check-config-presence.mjs`
2. `scripts/check-doc-consistency.mjs`
3. `scripts/check-file-limits.mjs`
4. `scripts/check-no-compat.mjs`
5. `scripts/check-browser-api-bindings.mjs`
6. `scripts/check-changed-scope.mjs`
7. `scripts/check-architecture-imports.mjs`
8. `scripts/check-eslint.mjs`
9. `scripts/check-dependency-cruiser.mjs`

That means “lint passed” in this repo is broader than “ESLint passed”.

## TypeScript baseline

Strict TypeScript is part of the hard policy, not team preference.

Pinned compiler expectations:

- `strict: true`
- `noImplicitAny: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `module: "NodeNext"`
- `moduleResolution: "NodeNext"`

Pinned runtime expectations:

- Node `20.19.5`
- pnpm `9.15.0`

## Commit-time enforcement

The following are blocked locally:

- committing with unstaged tracked changes
- committing before the full quality gate passes
- committing from `main` or `master`
- committing from a non-`task/<slug>` branch
- committing after the worktree changed relative to the last gate stamp

Tracked hook entrypoints:

- `.githooks/pre-commit`
- `scripts/setup-git-hooks.mjs`
- `scripts/codex-safe-git.sh`

## Practical reading order

If you need the shortest path to understand enforcement:

1. [quality-gate.md](./quality-gate.md)
2. [code-standards.md](./code-standards.md)
3. this document
4. [eslint.config.mjs](../eslint.config.mjs)
5. [scripts/check-repo-lint.mjs](../scripts/check-repo-lint.mjs)

## Rule of thumb

In this repository:

- `format` checks style shape
- `lint` checks code policy and architecture policy
- `typecheck` checks strict typed correctness
- `tests` check behavior
- `pre-commit` and safe commit make the gate binding

There is no supported path around these rules for normal development.
