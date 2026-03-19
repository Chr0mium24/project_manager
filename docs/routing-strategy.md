# Routing Strategy

This document defines the final single-port routing architecture to be implemented by scripts and the main server.

## Constraint

The server must expose one external port.

This is compatible with the architecture.

## Strategy

Use one ingress port and route internally by path.

That means one public origin handles:

- management UI
- API
- static project routes
- dynamic project routes

Important:

- public URL layout is not the same as internal storage layout
- do not expose internal filesystem structure directly as the public route contract

## Recommended route map

### Management UI

- `/`
- `/projects`
- `/projects/:slug`
- `/projects/:slug/editor`

### Control API

- `/api/projects`
- `/api/projects/:slug`
- `/api/projects/:slug/files`
- `/api/projects/:slug/file-tree`
- `/api/projects/:slug/file?path=...`
- `PUT /api/projects/:slug/file`
- `POST /api/projects/:slug/tasks`
- `POST /api/projects/:slug/tasks/:taskSlug/summarize`
- `POST /api/projects/:slug/tasks/:taskSlug/validate`
- `POST /api/projects/:slug/tasks/:taskSlug/apply`
- `POST /api/publish/static/:slug`
- `/api/ai/tasks`
- `/api/publish`

### Static project publish routes

- `/p/:slug`

### Dynamic project publish routes

- `/app/:slug`
- `/api/runtime/:slug/*` if the project exposes API-style handlers

V1 runtime handler contract:

- first-party dynamic project only
- entry module exports `handler(context)`
- `context` contains `slug`, `pathname`, `runtimePath`, `method`, `route`, `query`, and `body`
- handler response is returned as JSON through the main server

## Final public route contract

This is the final V1 route contract.

### Platform routes

- `/`
- `/projects/*`
- `/assets/*`

### Platform control API

- `/api/projects/*`
- `/api/ai/*`
- `/api/publish/*`

### Managed project routes

- static project entry: `/p/:slug/*`
- dynamic project app entry: `/app/:slug/*`
- dynamic project runtime API: `/api/runtime/:slug/*`

Do not expose managed projects under `/static/:slug` or `/api/:slug`.

## How to implement single-port routing

Recommended options:

1. one `Fastify` server with route prefixes
2. one reverse-proxy layer in front of internal handlers
3. one edge/router layer forwarding by prefix

For V1, the simplest good choice is:

- one `Fastify` server
- route prefixes
- internal service modules behind that server

## Why this works

You do not need one port per internal concern.

You only need:

- one external port
- clear path namespaces
- internal module isolation

## Example

One server can host:

- `/api/*` -> control plane
- `/p/*` -> static published projects
- `/app/*` -> dynamic project runtime
- `/assets/*` -> shared assets

## Internal storage layout

The recommended internal layout is:

```text
storage/
  static-builds/
    <slug>/
      index.html
      assets/
  dynamic-projects/
    <slug>/
      current/
        ...
  route-registry/
    dev-routes.json
```

Rules:

- static publish artifacts are stored under `storage/static-builds/<slug>/`
- dynamic project runtime material is stored under `storage/dynamic-projects/<slug>/`
- route exposure metadata is managed separately in a route registry
- public routes must be resolved through the main server, not by exposing storage directories directly

## Final implementation model

V1 should implement routing through one main `Fastify` server.

That server is responsible for:

1. serving the management UI
2. serving the platform control API
3. serving static project output from the static-build storage
4. dispatching dynamic project requests to internal runtime handlers
5. reading approved route registration data

## Scripted implementation rule

This routing architecture must be implemented through approved scripts and server-side route registration.

At minimum:

- build scripts publish static output into the static-build directory
- runtime registration scripts write route registration metadata
- the main server reads registration metadata and mounts routes
- development route registration must update `storage/route-registry/dev-routes.json` as a multi-route registry, not overwrite a single ad hoc record

Do not implement route exposure by manually editing ad hoc server files for each project.

## Rule

No feature should assume it can open a new public port.

If a component needs isolation, keep it internal and proxy through the main server.

## Development enforcement

For development-time exposure:

- do not bind extra public ports directly from feature code
- use a registration script and route through the main server
- keep the main server as the only public entrypoint

## Required helper scripts

V1 should expose script entrypoints like:

- `scripts/register-dev-route.sh`
- `scripts/publish-static-project.sh`
- `scripts/register-dynamic-project.sh`

These names can evolve, but the architecture must remain script-driven.
