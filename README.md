# Project Manager

Local development quick start for the main repository lives here. Formal architecture and workflow rules remain under [docs/](./docs/README.md).

## Quick Start

Recommended runtime:

- `Node 20`
- `corepack pnpm`

One-command local startup:

```bash
./scripts/dev-up.sh
```

Equivalent package-manager entrypoint:

```bash
corepack pnpm dev
```

What the helper does:

- installs dependencies on first run if `node_modules/` is missing
- defaults `PROJECT_MANAGER_ADMIN_TOKEN` to `local-dev-token` if unset
- starts the gateway API/runtime server on `http://127.0.0.1:3101/`
- starts the Vue/Vite management UI on `http://127.0.0.1:3100/`
- waits for the gateway health check and the Vite UI before reporting readiness
- auto-opens the control plane in a browser when a local opener is available

Overrides:

```bash
PORT=3200 GATEWAY_PORT=3201 PROJECT_MANAGER_ADMIN_TOKEN=my-token ./scripts/dev-up.sh
PROJECT_MANAGER_OPEN_BROWSER=0 ./scripts/dev-up.sh
```

## Notes

- Open the control plane at `http://127.0.0.1:3100/`
- The gateway backend listens on `http://127.0.0.1:3101/` during `dev-up`
- For control-plane write actions, paste the admin token into the page auth field
- Read routes work without auth, but non-`GET` control mutations require `Authorization: Bearer <token>`

## Useful Commands

```bash
corepack pnpm quality-gate
corepack pnpm build:web
corepack pnpm clean:web
corepack pnpm validate:content-repo
corepack pnpm dev:gateway
corepack pnpm dev:web
```

## Docs

- [Docs Index](./docs/README.md)
- [Tech Stack](./docs/tech-stack.md)
- [Routing Strategy](./docs/routing-strategy.md)
- [Codex Development](./docs/codex-development.md)
