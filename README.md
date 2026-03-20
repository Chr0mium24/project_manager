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
- starts the gateway on `http://127.0.0.1:3100/`

Overrides:

```bash
PORT=3200 PROJECT_MANAGER_ADMIN_TOKEN=my-token ./scripts/dev-up.sh
```

## Notes

- Open the control plane at `http://127.0.0.1:3100/`
- For control-plane write actions, paste the admin token into the page auth field
- Read routes work without auth, but non-`GET` control mutations require `Authorization: Bearer <token>`

## Useful Commands

```bash
corepack pnpm quality-gate
corepack pnpm validate:content-repo
corepack pnpm dev:gateway
```

## Docs

- [Docs Index](./docs/README.md)
- [Tech Stack](./docs/tech-stack.md)
- [Routing Strategy](./docs/routing-strategy.md)
- [Codex Development](./docs/codex-development.md)
