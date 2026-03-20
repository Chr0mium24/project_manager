import { spawn } from "node:child_process";

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

export type CodexExecutor = (input: CodexExecInput) => CodexExecResult | Promise<CodexExecResult>;

function joinChunks(chunks: string[]): string {
  return chunks.join("");
}

export function runCodexExec(input: CodexExecInput): Promise<CodexExecResult> {
  return new Promise((resolve) => {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    let settled = false;
    const child = spawn(
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
        cwd: input.cwd
      }
    );

    function finish(result: { exitCode: number | null; error: string | null }): void {
      if (settled) {
        return;
      }

      settled = true;
      resolve({
        ...result,
        stdout: joinChunks(stdoutChunks),
        stderr: joinChunks(stderrChunks)
      });
    }

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(String(chunk));
    });
    child.stderr.on("data", (chunk) => {
      stderrChunks.push(String(chunk));
    });
    child.on("error", (error) => {
      finish({
        exitCode: null,
        error: error.message
      });
    });
    child.on("close", (code) => {
      finish({
        exitCode: code,
        error: null
      });
    });
  });
}
