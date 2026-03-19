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
- the current runnable lanes are implemented with Node policy scripts plus `validation/` tests
- once the product monorepo is bootstrapped, the same lane names stay stable and their implementations can move to `pnpm`, `turbo`, `tsx`, `eslint`, `tsc`, `vitest`, and `playwright`

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

## Exceptions

Exceptions are allowed only with a short architecture record.

That record must explain:

- why the gate is insufficient
- why the exception is temporary
- what cleanup step is required

Without that record, the gate stands.
