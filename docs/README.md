# Project Manager Docs

This folder contains the formal development rules for the project manager platform.

These docs are the source of truth for:

- architecture
- runtime and toolchain selection
- testing gate
- code quality rules
- routing and single-port strategy

## Index

- [Architecture Overview](./architecture-overview.md)
- [Tech Stack](./tech-stack.md)
- [Development Architecture](./development-architecture.md)
- [Testing Strategy](./testing-strategy.md)
- [Quality Gate](./quality-gate.md)
- [Code Standards](./code-standards.md)
- [Routing Strategy](./routing-strategy.md)
- [Codex Development](./codex-development.md)
- [Managed Project Codex Workflow](./managed-project-codex-workflow.md)
- [Sandbox And Git Policy](./sandbox-and-git.md)

## Status

These docs are based on the validation work already completed in `validation/`.

Scope rule:

- `docs/` is the formal source of truth for the main repository
- `validation/` may contain narrower validation-only rules for experiments
- if there is a conflict, `docs/` wins for the main product architecture

Confirmed from validation:

- script-driven project creation works
- Codex can read docs and use the bootstrap script
- static and dynamic project runtime split is workable
- local debug server shape is valid
- test gate can be enforced before feature expansion
