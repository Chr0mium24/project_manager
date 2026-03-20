import { spawn } from "node:child_process";

export interface CodexExecInput {
  cwd: string;
  prompt: string;
  sessionId?: string;
}

export interface CodexExecResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  error: string | null;
  sessionId: string | null;
}

export type CodexExecutor = (input: CodexExecInput) => CodexExecResult | Promise<CodexExecResult>;

function joinChunks(chunks: string[]): string {
  return chunks.join("");
}

export function buildCodexExecArgs(input: CodexExecInput): string[] {
  const baseArgs = [
    "exec",
    "--skip-git-repo-check",
    "--json",
    "--sandbox",
    "workspace-write",
    "--cd",
    input.cwd
  ];

  if (input.sessionId) {
    return [...baseArgs, "resume", input.sessionId, input.prompt];
  }

  return [...baseArgs, input.prompt];
}

export function readSessionIdFromEventStream(output: string): string | null {
  for (const line of output.split("\n")) {
    if (!line.trim()) {
      continue;
    }

    try {
      const event = JSON.parse(line) as { type?: unknown; thread_id?: unknown };
      if (event.type === "thread.started" && typeof event.thread_id === "string") {
        return event.thread_id;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export function runCodexExec(input: CodexExecInput): Promise<CodexExecResult> {
  return new Promise((resolve) => {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    let settled = false;
    const child = spawn(
      "codex",
      buildCodexExecArgs(input),
      {
        cwd: input.cwd
      }
    );

    function finish(result: { exitCode: number | null; error: string | null }): void {
      if (settled) {
        return;
      }

      settled = true;
      const stdout = joinChunks(stdoutChunks);
      resolve({
        ...result,
        stdout,
        stderr: joinChunks(stderrChunks),
        sessionId: readSessionIdFromEventStream(stdout) ?? input.sessionId ?? null
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
