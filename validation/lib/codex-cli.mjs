import { spawnSync } from "node:child_process";

export function runCodex(args, options = {}) {
  return spawnSync("codex", args, {
    encoding: "utf8",
    ...options
  });
}

export function getCodexHelp() {
  const result = runCodex(["--help"]);
  if (result.error) {
    throw result.error;
  }
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

export function getCodexExecHelp() {
  const result = runCodex(["exec", "--help"]);
  if (result.error) {
    throw result.error;
  }
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

export function probeCodexExecLive(prompt, cwd) {
  const result = runCodex([
    "exec",
    "--skip-git-repo-check",
    "--ephemeral",
    "--json",
    "--cd",
    cwd,
    prompt
  ], {
    cwd
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ?? null
  };
}
