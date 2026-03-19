# Routing Strategy

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

## Recommended route map

### Management UI

- `/`
- `/projects`
- `/projects/:slug`
- `/projects/:slug/editor`

### Control API

- `/api/projects`
- `/api/projects/:slug`
- `/api/ai/tasks`
- `/api/publish`

### Static project publish routes

- `/p/:slug`

### Dynamic project publish routes

- `/app/:slug`
- `/api/runtime/:slug/*` if the project exposes API-style handlers

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

## Rule

No feature should assume it can open a new public port.

If a component needs isolation, keep it internal and proxy through the main server.
