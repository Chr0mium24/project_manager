# Quality Gate

## Rule

Every feature must pass the quality gate before it is considered complete.

There is no "merge now, clean up later" path.

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

## Feature readiness rule

A feature is not ready unless:

- implementation is complete
- tests for the changed behavior exist
- all required checks pass
- module boundaries remain intact

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
