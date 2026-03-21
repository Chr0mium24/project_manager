import { spawn } from "node:child_process";

export interface ProjectMutationChecksResult {
  command: string;
  durationMs: number;
  exitCode: number | null;
  ok: boolean;
  stderr: string;
  stdout: string;
}

export type ProjectMutationChecksRunner = (
  rootDir: string
) => ProjectMutationChecksResult | Promise<ProjectMutationChecksResult>;

function joinChunks(chunks: string[]): string {
  return chunks.join("");
}

export function runProjectMutationChecks(rootDir: string): Promise<ProjectMutationChecksResult> {
  return new Promise((resolve) => {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    const startedAt = Date.now();
    const child = spawn("./scripts/run-quality-gate.sh", {
      cwd: rootDir,
      shell: false
    });

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(String(chunk));
    });
    child.stderr.on("data", (chunk) => {
      stderrChunks.push(String(chunk));
    });
    child.on("close", (exitCode) => {
      resolve({
        command: "./scripts/run-quality-gate.sh",
        durationMs: Date.now() - startedAt,
        exitCode,
        ok: exitCode === 0,
        stdout: joinChunks(stdoutChunks),
        stderr: joinChunks(stderrChunks)
      });
    });
    child.on("error", (error) => {
      resolve({
        command: "./scripts/run-quality-gate.sh",
        durationMs: Date.now() - startedAt,
        exitCode: null,
        ok: false,
        stdout: joinChunks(stdoutChunks),
        stderr: `${joinChunks(stderrChunks)}${error.message}\n`
      });
    });
  });
}
