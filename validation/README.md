# Validation Workspace

This workspace validates the minimum architecture assumptions before building the full product.

Current scope:

- `content-repo/` directory shape
- `project.json` contract
- `projects-index.json` consistency
- Minimal test gate using built-in Node test runner
- Codex CLI feasibility checks
- Local debug server
- Script-driven project bootstrap

## Commands

```bash
npm test
npm run validate
npm run test:codex
npm run probe:codex
npm run probe:codex-create
npm run dev
node scripts/create-project.mjs --content-repo ./content-repo --slug demo-static --name "Demo Static" --runtime static
node scripts/create-project.mjs --content-repo ./content-repo --slug demo-service --name "Demo Service" --runtime dynamic
```

## Notes

- No third-party dependencies are used in this workspace
- The validator logic is intentionally small and deterministic
- If these checks fail, the main architecture contract is not stable enough yet
- `test:codex` checks local CLI capability and command surface
- `probe:codex` can optionally run a live non-interactive Codex execution when `RUN_CODEX_LIVE=1`
- `probe:codex-create` can optionally ask Codex to create a project through the bootstrap script and then verifies the result
- `create-project.mjs` is the canonical project bootstrap path for new projects
- `dev-server.mjs` serves a minimal local debug surface for static and dynamic routes

## Environment

Recommended local toolchain strategy:

- Preferred: `Volta`
- Acceptable fallback: `nvm`
- If this monorepo later becomes multi-language: consider `mise`

Reason:

- `Volta` pins Node and package manager versions per project, which is closer to the workflow discipline that `uv` gives Python projects
- `nvm` is fine for shell switching, but weaker for project-local pinning
