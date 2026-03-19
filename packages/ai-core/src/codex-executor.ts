import { spawnSync } from "node:child_process";

export interface CodexExecInput {
  cwd: string;
  prompt: string;
}

export interface CodexExecResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  error: string | null;
}

export type CodexExecutor = (input: CodexExecInput) => CodexExecResult;

export function runCodexExec(input: CodexExecInput): CodexExecResult {
  const result = spawnSync(
    "codex",
    [
      "exec",
      "--skip-git-repo-check",
      "--ephemeral",
      "--json",
      "--cd",
      input.cwd,
      input.prompt
    ],
    {
      cwd: input.cwd,
      encoding: "utf8"
    }
  );

  return {
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error?.message ?? null
  };
}
