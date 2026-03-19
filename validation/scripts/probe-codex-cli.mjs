import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getCodexExecHelp, getCodexHelp, probeCodexExecLive } from "../lib/codex-cli.mjs";

function printSection(title, body) {
  console.log(`\n[${title}]`);
  console.log(body);
}

const baseHelp = getCodexHelp();
printSection("codex --help status", String(baseHelp.status));

const execHelp = getCodexExecHelp();
printSection("codex exec --help status", String(execHelp.status));

const supportSummary = {
  hasExec: execHelp.stdout.includes("Usage: codex exec"),
  hasJson: execHelp.stdout.includes("--json"),
  hasEphemeral: execHelp.stdout.includes("--ephemeral"),
  hasSkipGitRepoCheck: execHelp.stdout.includes("--skip-git-repo-check"),
  hasOutputSchema: execHelp.stdout.includes("--output-schema")
};

printSection("capabilities", JSON.stringify(supportSummary, null, 2));

if (process.env.RUN_CODEX_LIVE !== "1") {
  printSection(
    "live probe",
    "skipped; set RUN_CODEX_LIVE=1 to attempt a real non-interactive Codex run"
  );
  process.exit(0);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-validation-"));
const live = probeCodexExecLive('Reply with a short confirmation that this directory is empty.', tempDir);

printSection("live status", String(live.status));
printSection("live stderr", live.stderr.trim() || "<empty>");
printSection("live stdout", live.stdout.trim() || "<empty>");

if (live.error) {
  throw live.error;
}
