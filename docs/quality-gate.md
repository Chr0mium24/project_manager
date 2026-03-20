# Quality Gate

## Rule

Every feature must pass the quality gate before it is considered complete.

There is no "merge now, clean up later" path.

Canonical command:

```bash
./scripts/run-quality-gate.sh
```

Current implementation detail:

- the gate is executable in this repository today
- the current runnable lanes are implemented with Node policy scripts, formal `content-repo/` validation, and root-level repository tests
- the `lint` lane now includes real `ESLint`, dependency-boundary checks, and changed-scope enforcement
- once the product monorepo is bootstrapped, the same lane names stay stable and their implementations can move to `pnpm`, `turbo`, `tsx`, `eslint`, `tsc`, `vitest`, and `playwright`
- the frontend rebuild must plug its framework-specific lint and tests into this same root gate rather than introducing an optional side path

## Required pipeline

The required order is:

1. `format:check`
2. `lint`
3. `typecheck`
4. `test:unit`
5. `test:integration`
6. `test:contract`
7. `test:e2e:smoke`

Conditional stages:

8. `test:git` for Git-related changes
9. `test:ai` for Codex or AI-related changes
10. `test:publish` for static or dynamic publish flow changes

Current repository implementation:

- the root quality gate runs these three lanes on every invocation
- this is intentionally stricter than the eventual optimized monorepo lane selection
- do not weaken the current root gate by skipping them ad hoc
- `test:contract` must validate the formal root `content-repo/`

## Feature readiness rule

A feature is not ready unless:

- implementation is complete
- tests for the changed behavior exist
- all required checks pass
- module boundaries remain intact
- the completed slice has been committed on its task branch

## Per-change expectations

### UI-only change

Must pass:

- format
- lint
- typecheck
- unit
- e2e smoke for affected path

If the change touches the rebuilt route-based frontend, also require:

- component coverage for changed views or components
- route smoke for each changed page
- mobile smoke for changed critical flows

### API or service change

Must pass:

- format
- lint
- typecheck
- unit
- integration
- contract

### Git workflow change

Must pass:

- format
- lint
- typecheck
- unit
- integration
- `test:git`

### Codex workflow change

Must pass:

- format
- lint
- typecheck
- unit
- integration
- `test:ai`

## Failure policy

A feature is blocked when:

- lint fails
- typecheck fails
- tests fail
- a required test is missing
- a runtime path changed without coverage
- module boundaries were violated
- a new frontend route landed without smoke coverage
- a page mixes multiple unrelated workflows because the route split was skipped

## Post-change discipline

After every code update, rerun:

```bash
./scripts/run-quality-gate.sh
```

This is required for frontend work too.

Do not treat UI iteration as exempt from the gate.

## Exceptions

Exceptions are allowed only with a short architecture record.

That record must explain:

- why the gate is insufficient
- why the exception is temporary
- what cleanup step is required

Without that record, the gate stands.
