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

## Top-level system model

The system has four major layers:

1. Frontend management UI
2. Backend control plane
3. Git-backed content repository
4. Codex automation layer

## Runtime split

### Static projects

- Published to frontend routes such as `/p/<slug>`
- Main output is static content
- Suitable for HTML/CSS/JS projects

### Dynamic projects

- Published to application routes such as `/app/<slug>` or `/api/<slug>`
- Require server-side execution or request handling
- Suitable for tools, APIs, and service-backed pages

## Development rule

The platform may look unified to users, but internally it must preserve runtime-specific behavior.

That means:

- one project model
- two runtime behaviors
- one management plane
- split publish and serve logic
