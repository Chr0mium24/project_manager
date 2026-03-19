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

## Status

These docs are based on the validation work already completed in `validation/`.

Confirmed from validation:

- script-driven project creation works
- Codex can read docs and use the bootstrap script
- static and dynamic project runtime split is workable
- local debug server shape is valid
- test gate can be enforced before feature expansion
