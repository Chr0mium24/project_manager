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
- [Frontend Rebuild Plan](./frontend-rebuild-plan.md)
- [Testing Strategy](./testing-strategy.md)
- [Quality Gate](./quality-gate.md)
- [Code Standards](./code-standards.md)
- [Routing Strategy](./routing-strategy.md)
- [Codex Development](./codex-development.md)
- [Managed Project Codex Workflow](./managed-project-codex-workflow.md)
- [Sandbox And Git Policy](./sandbox-and-git.md)

## Status

These docs describe the current formal repository code and root-level test suite.

Scope rule:

- `docs/` is the formal source of truth for the main repository
- historical validation work does not override these docs
- if there is a conflict, `docs/` wins for the main product architecture

Confirmed in the formal repository:

- script-driven project creation works
- Codex can read docs and use the bootstrap script
- static and dynamic project runtime split is workable
- local gateway server shape is valid
- test gate can be enforced before feature expansion
