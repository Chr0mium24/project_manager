import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { probeCodexExecLive } from "../lib/codex-cli.mjs";

test("optional live codex exec probe", { skip: process.env.RUN_CODEX_LIVE !== "1" }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-live-probe-"));
  const result = probeCodexExecLive("Reply with one short sentence.", tempDir);

  assert.equal(result.error, null);
  assert.equal(typeof result.stdout, "string");
  assert.equal(typeof result.stderr, "string");
  assert.notEqual(result.status, null);
});
