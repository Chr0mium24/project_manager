# Architecture Overview

## Goal

Build a local-first project manager for many small projects with:

- Git-backed content storage
- browser editing
- static and dynamic project support
- Codex-assisted project creation and modification
- strict modular development boundaries
- hard test gates before feature expansion

## Core decisions

1. Managed content lives in one large Git repository
2. Projects are divided into two runtime classes:
   - `static`
   - `dynamic`
3. Product code is built as a modular monorepo
4. V1 starts as a modular system with microservice boundaries, not a distributed deployment
5. Codex interacts through scripts and contracts, not ad hoc file edits
6. Every feature must pass the test gate before it can land

## Explicit non-goals for V1

V1 does not support:

- importing arbitrary third-party GitHub repositories for managed deployment
- running untrusted external repositories as dynamic managed workloads

## Top-level system model

The system has four major layers:

1. Frontend management UI
2. Backend control plane
3. Git-backed content repository
4. Codex automation layer

Formal runtime content must live under the repository root `content-repo/`.

The formal `content-repo/` must be validated by product code in `packages/project-core`.

Product runtime code must not depend on ad hoc experimental directories or one-off local prototypes.

## Runtime split

### Static projects

- Published to frontend routes such as `/p/<slug>`
- Main output is static content
- Suitable for HTML/CSS/JS projects
- Internal artifacts should be published into a static-build storage directory, not directly exposed as filesystem routes

### Dynamic projects

- Published to application routes such as `/app/<slug>` and `/api/runtime/<slug>`
- Require server-side execution or request handling
- Suitable for tools, APIs, and service-backed pages
- Must be dispatched through the main server, not through ad hoc public ports

## Development rule

The platform may look unified to users, but internally it must preserve runtime-specific behavior.

That means:

- one project model
- two runtime behaviors
- one management plane
- split publish and serve logic
