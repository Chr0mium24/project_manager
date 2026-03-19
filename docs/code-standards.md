# Code Standards

## Rule

Code quality rules are mandatory and enforced by tooling.

## Required standards

### TypeScript

- `strict: true`
- no implicit any
- no unchecked JSON use without validation
- public interfaces must be typed
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`

### Linting

Use `ESLint` with hard failures for:

- unused variables
- accidental any
- shadowed variables
- unreachable code
- floating promises
- inconsistent imports
- circular dependencies
- overly complex functions
- overgrown files
- overly deep nesting
- excessive parameter count
- large public APIs without explicit types
- runtime compatibility branches
- package-manager compatibility branches
- CommonJS fallback paths

## Enforced structural limits

These limits should be enforced by lint unless there is an approved exception.

Default limits:

- file length: `<= 400` lines
- function length: `<= 80` lines
- max nesting depth: `<= 3`
- cyclomatic complexity: `<= 10`
- max parameters per function: `<= 4`
- max statements per function: `<= 20`

Preferred tighter limits for core packages:

- file length: `<= 300` lines
- function length: `<= 60` lines
- cyclomatic complexity: `<= 8`

## Required dependency rules

- no circular imports
- no deep imports into another module's private folders
- no cross-layer imports that violate architecture direction
- no default export in shared core packages unless there is a strong reason
- no wildcard exports for large mixed-responsibility barrels

## Required runtime safety rules

- validate all external input with `zod` or equivalent
- never trust filesystem content without validation
- never trust AI output without validation
- no fire-and-forget promise unless explicitly documented
- all process execution must capture exit status and stderr

## Compatibility policy

Target the pinned runtime exactly.

Do not write compatibility code for:

- older Node versions
- alternative runtimes such as `Bun` or `Deno`
- multiple package managers
- CommonJS fallback paths inside ESM packages
- legacy fetch polyfills on the pinned runtime

Forbidden examples:

- branching on `process.versions.node`
- runtime checks for `Bun` or `Deno`
- `require()` inside TypeScript or ESM code
- `module.exports` or `exports.*`
- package-manager detection through `npm_config_user_agent`
- `node-fetch` fallback paths

Rule:

- if the target environment is unclear, verify it in a narrow root-level test or fixture first
- do not ship speculative compatibility code

### Formatting

Use `Prettier` as the default formatter.

Formatting is not a style suggestion. It is part of the gate.

### Imports

- prefer explicit imports
- avoid giant utility barrels
- avoid deep relative imports across module boundaries

### Files

- one file should have one clear responsibility
- avoid large grab-bag modules
- prefer pure functions in core packages
- split feature files before they become "manager" or "helper" dumping grounds

### Functions

- keep functions shallow
- keep branch count low
- prefer extracted private helpers over deeply nested logic
- prefer data transformation pipelines over imperative branching when readable
- if a function needs comments to explain every branch, it is too large

### Comments

- comments should explain non-obvious intent
- do not add commentary that restates syntax

## Hard failures

The following should fail CI:

- lint errors
- typecheck errors
- formatting drift
- missing contract validation on external input
- architecture-boundary violations
- circular dependencies
- file or function complexity above approved limits

## Suggested tooling

- `eslint`
- `@typescript-eslint/eslint-plugin`
- `eslint-plugin-import`
- `eslint-plugin-promise`
- `eslint-plugin-boundaries`
- `eslint-plugin-sonarjs`
- `prettier`
- `typescript`
- `dependency-cruiser`
- `lint-staged`
- `husky` only if local hooks remain simple and fast

Current repository enforcement:

- `scripts/check-no-compat.mjs` enforces exact banned compatibility patterns
- `eslint.config.mjs` enforces AST-level rules for TypeScript and JavaScript source in `apps/`, `packages/`, `scripts/`, and `tests/`
- `scripts/check-architecture-imports.mjs` enforces public-entry-only cross-module imports
- `scripts/check-changed-scope.mjs` enforces the single-slice change-scope rule
- `.dependency-cruiser.cjs` enforces cycles and forbidden high-level dependencies
- `scripts/check-file-limits.mjs` enforces file-size limits exactly today

## Exception policy

If a file or function must exceed limits temporarily:

1. document why
2. add a follow-up task
3. keep the exception narrow

Do not normalize complexity drift.
