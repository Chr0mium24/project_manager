# Validation Workspace

This workspace validates the minimum architecture assumptions before building the full product.

Current scope:

- `content-repo/` directory shape
- `project.json` contract
- `projects-index.json` consistency
- Minimal test gate using built-in Node test runner
- Codex CLI feasibility checks

## Commands

```bash
npm test
npm run validate
npm run test:codex
npm run probe:codex
node scripts/create-project.mjs --content-repo ./content-repo --slug demo-static --name "Demo Static" --runtime static
node scripts/create-project.mjs --content-repo ./content-repo --slug demo-service --name "Demo Service" --runtime dynamic
```

## Notes

- No third-party dependencies are used in this workspace
- The validator logic is intentionally small and deterministic
- If these checks fail, the main architecture contract is not stable enough yet
- `test:codex` checks local CLI capability and command surface
- `probe:codex` can optionally run a live non-interactive Codex execution when `RUN_CODEX_LIVE=1`
- `create-project.mjs` is the canonical project bootstrap path for new projects
