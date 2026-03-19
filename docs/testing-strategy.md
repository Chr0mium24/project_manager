# Testing Strategy

## Rule

No new feature lands until the test gate passes.

This is not optional.

## Required gate

1. format check
2. lint
3. typecheck
4. unit tests
5. integration tests
6. contract tests
7. e2e smoke tests

If the change touches Git or AI logic, also require:

8. Git fixture tests
9. AI task tests

## Test framework structure

The testing system must itself be modular.

Recommended packages:

- `testkit-core`
- `testkit-vitest`
- `testkit-playwright`
- `testkit-contract`
- `testkit-git-fixture`
- `testkit-ai-fixture`

## Required test ownership

Every module must own its own tests.

That means:

- package tests stay next to that package
- app tests stay with that app
- shared fixtures stay in `testkit-*`

Do not centralize all tests into one generic folder.

## Test categories

### Unit

Validate isolated logic:

- schema validation
- project metadata rules
- route computation
- bootstrap logic

### Integration

Validate module-level workflows:

- create project
- update index
- publish static
- publish dynamic

### Contract

Validate API and module contracts:

- request shape
- response shape
- producer/consumer compatibility

### E2E smoke

Validate critical user paths:

- open project list
- create project
- open editor
- preview static project
- inspect dynamic project metadata

## Test design rules

- tests must be deterministic
- tests must not depend on developer local state
- tests must isolate fixture mutation
- optional live tests must be explicitly enabled
- long-running tests must be separated from the default fast gate

## Coverage expectation

Do not optimize for vanity coverage numbers, but require meaningful coverage for changed code.

Minimum rule:

- changed core logic must have direct unit coverage
- changed workflow logic must have integration coverage
- changed external contracts must have contract coverage
- changed user-critical flows must have smoke coverage

## Fast and slow lanes

The test system should expose:

- a fast lane for daily feature iteration
- a full lane for pre-merge validation

Suggested split:

- fast lane: format, lint, typecheck, unit
- full lane: everything in the quality gate

## Validation status

Already proven in `validation/`:

- content repo schema checks
- project bootstrap checks
- Codex CLI capability checks
- Codex script-driven create-project flow
- debug server route smoke

## False-negative policy

Tests must be designed so that:

- sandbox-only restrictions do not cause fake failures
- optional live probes are opt-in
- fixture counts are not hardcoded when the system mutates state

If a test becomes flaky or misleading, fix the test before adding new features.
