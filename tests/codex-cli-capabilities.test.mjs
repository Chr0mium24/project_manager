import assert from "node:assert/strict";
import test from "node:test";
import { getCodexExecHelp, getCodexHelp } from "./helpers/codex-cli.mjs";

test("codex CLI is installed and exposes core subcommands", () => {
  const result = getCodexHelp();

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Codex CLI/);
  assert.match(result.stdout, /exec/);
  assert.match(result.stdout, /review/);
  assert.match(result.stdout, /mcp-server/);
});

test("codex exec exposes the required non-interactive flags", () => {
  const result = getCodexExecHelp();

  assert.equal(result.status, 0);
  assert.match(result.stdout, /--json/);
  assert.match(result.stdout, /--ephemeral/);
  assert.match(result.stdout, /--skip-git-repo-check/);
  assert.match(result.stdout, /--output-schema/);
  assert.match(result.stdout, /--cd/);
});
