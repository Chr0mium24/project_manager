# Tech Stack

## Recommendation

Use:

- `Volta` for toolchain pinning
- `Node 20` as the runtime
- `node --import tsx` for development execution
- `pnpm` via `corepack` as the package manager entrypoint
- `turbo` for monorepo orchestration

Do not use `Bun` as the primary runtime in V1.

## Why Volta

`Volta` manages the Node toolchain. It is not a runtime replacement.

It pins:

- `node`
- `npm`
- `pnpm`

Why this matters:

- project-local version consistency
- reproducible local development
- fewer shell-level version mismatches
- closer discipline to Python's `uv` workflow

## Why Node over Bun

`Bun` is interesting, but not the right V1 foundation here.

Reasons:

1. Current formal scripts and Codex workflow already run on Node
2. Test and monorepo tooling are more predictable on Node
3. We need exact runtime behavior and low surprise more than raw speed
4. The main project risk is architecture drift, not runtime throughput

## Why `tsx`

`tsx` is the right V1 execution model for this project.

Use it for:

- local backend development
- local worker development
- scripts during active development

Why:

1. It keeps TypeScript execution simple
2. It works well with normal Node tooling
3. `node --import tsx` avoids depending on `tsx` CLI IPC behavior in restricted environments
4. It is a cleaner default than introducing Bun as the runtime

Recommended command shape:

```bash
node --import tsx path/to/file.ts
```

Avoid treating the bare `tsx` CLI as the required execution surface.

## Why `corepack pnpm`

The repository standard remains `pnpm`, but the stable entrypoint should be `corepack pnpm`.

Why:

1. it respects the pinned package manager version from the repository
2. it avoids depending on whichever standalone `pnpm` happens to be installed globally
3. it keeps the package-manager contract explicit for Codex and humans

## Recommended core stack

Frontend:

- `Vue 3`
- `TypeScript`
- `Vite`
- `Vue Router`
- `Pinia`
- `Monaco Editor`
- application CSS tokens, not `Tailwind CSS` by default

Backend:

- `TypeScript`
- `Fastify`
- `zod`
- `tsx`

Monorepo:

- `pnpm`
- `turbo`

Testing:

- `Vitest`
- `Vue Test Utils`
- `Playwright`
- Node built-in test runner for low-level validation tools

Code quality:

- `ESLint`
- `Prettier`
- `TypeScript strict mode`
- `vue-tsc` for strict frontend type safety

## Frontend architecture decision

The formal web UI should be rebuilt as a route-based Vue application.

Required route groups:

- project index
- project overview
- project workspace
- project versions
- project AI tasks

Do not continue the long-term product UI as one monolithic page-level controller.

## Future experiments

Allowed later:

- evaluate `Bun` for isolated tooling or local-only scripts
- evaluate `Biome` as a lint/format alternative
- evaluate `mise` if the repo becomes strongly multi-language

Not allowed in V1:

- replacing the primary Node runtime with Bun
- mixing multiple package managers
- using third-party GitHub project deployment as a core platform feature
