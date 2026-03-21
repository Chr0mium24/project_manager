import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  applyManagedTask,
  getManagedTaskPaths,
  type ManagedTaskApplyResult,
  type ManagedTaskSummary,
  readManagedTaskValidation,
  startManagedTask,
  summarizeManagedTask,
  validateManagedTask
} from "@project-manager/project-core";
import { z } from "zod";
import {
  runCodexExec,
  type CodexExecResult,
  type CodexExecutor
} from "./codex-executor.ts";
import {
  appendTextArtifact,
  readJsonArtifact,
  readTextArtifact,
  writeTextArtifact
} from "./task-artifacts.ts";
import {
  getAiTaskRoot,
  listAiTasks,
  readAiTask,
  writeAiTaskRecord,
  type AiTaskRecord
} from "./task-store.ts";

export interface CreateAiTaskOptions {
  projectSlug: string;
  taskSlug: string;
  prompt: string;
  force?: boolean;
  parentTaskId?: string;
  sandboxMode?: "danger-full-access" | "workspace-write";
}

export interface AiTaskRunnerOptions {
  executor?: CodexExecutor;
}

export interface AiTaskDiagnostics {
  taskId: string;
  parentTaskId: string | null;
  sessionId: string | null;
  status: AiTaskRecord["status"];
  codexExitCode: number | null;
  error: string | null;
  stdout: string;
  stderr: string;
}

const createAiTaskOptionsSchema = z.object({
  projectSlug: z.string().min(1),
  taskSlug: z.string().min(1),
  prompt: z.string().min(1),
  force: z.boolean().optional(),
  parentTaskId: z.string().min(1).optional(),
  sandboxMode: z.enum(["danger-full-access", "workspace-write"]).optional()
});
const aiTaskSummarySchema = z.object({
  projectSlug: z.string().min(1),
  taskSlug: z.string().min(1),
  generatedAt: z.string().min(1),
  changedFiles: z.number().int().min(0),
  changes: z.array(z.object({
    path: z.string().min(1),
    kind: z.enum(["added", "deleted", "modified"])
  }))
});

function nowIso(): string {
  return new Date().toISOString();
}

function createTaskId(taskSlug: string): string {
  return `${taskSlug}-${randomUUID().slice(0, 8)}`;
}

function resolveAvailableTaskSlug(
  rootDir: string,
  projectSlug: string,
  taskSlug: string,
  force: boolean | undefined
): string {
  if (force) {
    return taskSlug;
  }

  const basePaths = getManagedTaskPaths(rootDir, projectSlug, taskSlug);
  if (!fs.existsSync(basePaths.taskRoot)) {
    return taskSlug;
  }

  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    const candidateTaskSlug = `${taskSlug}-${String(suffix)}`;
    const candidatePaths = getManagedTaskPaths(rootDir, projectSlug, candidateTaskSlug);
    if (!fs.existsSync(candidatePaths.taskRoot)) {
      return candidateTaskSlug;
    }
  }

  throw new Error(`managed task slug exhausted: ${projectSlug}/${taskSlug}`);
}

function buildQueuedTask(rootDir: string, input: {
  taskId: string;
  projectSlug: string;
  taskSlug: string;
  prompt: string;
  sandboxMode: "danger-full-access" | "workspace-write";
  parentTaskId: string | null;
  sessionId: string | null;
}): AiTaskRecord {
  const taskPaths = getManagedTaskPaths(rootDir, input.projectSlug, input.taskSlug);
  return {
    schemaVersion: 1,
    taskId: input.taskId,
    kind: "managed-project-edit",
    status: "queued",
    projectSlug: input.projectSlug,
    taskSlug: input.taskSlug,
    prompt: input.prompt,
    sandboxMode: input.sandboxMode,
    parentTaskId: input.parentTaskId,
    sessionId: input.sessionId,
    createdAt: nowIso(),
    completedAt: null,
    managedTaskPath: path.relative(rootDir, taskPaths.manifestPath),
    workspaceProjectPath: path.relative(rootDir, taskPaths.workspaceProjectDir),
    stdoutPath: null,
    stderrPath: null,
    summaryPath: null,
    validationPath: null,
    codexExitCode: null,
    error: null,
    appliedAt: null
  };
}

function completeTask(
  rootDir: string,
  task: AiTaskRecord,
  status: "completed" | "failed",
  result: CodexExecResult & {
    summaryPath?: string;
    validationPath?: string;
  }
): AiTaskRecord {
  const taskRoot = getAiTaskRoot(rootDir, task.taskId);
  const stdoutPath = writeTextArtifact(path.join(taskRoot, "stdout.log"), result.stdout);
  const stderrPath = writeTextArtifact(path.join(taskRoot, "stderr.log"), result.stderr);

  return writeAiTaskRecord(rootDir, {
    ...task,
    status,
    completedAt: nowIso(),
    stdoutPath: path.relative(rootDir, stdoutPath),
    stderrPath: path.relative(rootDir, stderrPath),
    summaryPath: result.summaryPath ?? null,
    validationPath: result.validationPath ?? null,
    codexExitCode: result.exitCode,
    error: result.error,
    sessionId: result.sessionId ?? task.sessionId,
    appliedAt: task.appliedAt
  });
}

function markTaskRunning(rootDir: string, task: AiTaskRecord): AiTaskRecord {
  const taskRoot = getAiTaskRoot(rootDir, task.taskId);
  const stdoutPath = path.join(taskRoot, "stdout.log");
  const stderrPath = path.join(taskRoot, "stderr.log");
  writeTextArtifact(stdoutPath, "");
  writeTextArtifact(stderrPath, "");
  return writeAiTaskRecord(rootDir, {
    ...task,
    status: "running",
    stdoutPath: path.relative(rootDir, stdoutPath),
    stderrPath: path.relative(rootDir, stderrPath)
  });
}

function writeWorkspaceFromParent(rootDir: string, task: AiTaskRecord, parentTask: AiTaskRecord): void {
  const workspaceProjectDir = path.join(rootDir, task.workspaceProjectPath);
  const parentWorkspaceProjectDir = path.join(rootDir, parentTask.workspaceProjectPath);
  if (!fs.existsSync(parentWorkspaceProjectDir) || !fs.statSync(parentWorkspaceProjectDir).isDirectory()) {
    throw new Error(`parent ai task workspace not found: ${parentTask.taskId}`);
  }

  fs.rmSync(workspaceProjectDir, { recursive: true, force: true });
  fs.cpSync(parentWorkspaceProjectDir, workspaceProjectDir, { recursive: true });
}

function readTaskParent(rootDir: string, parentTaskId: string | undefined, projectSlug: string): AiTaskRecord | null {
  if (parentTaskId === undefined) {
    return null;
  }

  const parentTask = readRequiredAiTask(rootDir, parentTaskId);
  if (parentTask.projectSlug !== projectSlug) {
    throw new Error(`parent ai task project mismatch: ${parentTaskId}`);
  }
  if (parentTask.status === "queued" || parentTask.status === "running") {
    throw new Error(`parent ai task is not ready to continue: ${parentTaskId}`);
  }

  return parentTask;
}

function readRequiredAiTask(rootDir: string, taskId: string): AiTaskRecord {
  const task = readAiTask(rootDir, taskId);
  if (task === null) {
    throw new Error(`ai task not found: ${taskId}`);
  }

  return task;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown ai task error";
}

export function createAiTask(
  rootDir: string,
  options: CreateAiTaskOptions
): AiTaskRecord {
  const normalizedOptions = createAiTaskOptionsSchema.parse(options);
  const parentTask = readTaskParent(rootDir, normalizedOptions.parentTaskId, normalizedOptions.projectSlug);
  const resolvedTaskSlug = resolveAvailableTaskSlug(
    rootDir,
    normalizedOptions.projectSlug,
    normalizedOptions.taskSlug,
    normalizedOptions.force
  );
  const taskId = createTaskId(resolvedTaskSlug);
  startManagedTask(rootDir, {
    projectSlug: normalizedOptions.projectSlug,
    taskSlug: resolvedTaskSlug,
    force: normalizedOptions.force,
    mode: "workspace"
  });
  const task = writeAiTaskRecord(
    rootDir,
    buildQueuedTask(rootDir, {
      taskId,
      projectSlug: normalizedOptions.projectSlug,
      taskSlug: resolvedTaskSlug,
      prompt: normalizedOptions.prompt,
      sandboxMode: normalizedOptions.sandboxMode ?? parentTask?.sandboxMode ?? "workspace-write",
      parentTaskId: parentTask?.taskId ?? null,
      sessionId: parentTask?.sessionId ?? null
    })
  );
  if (parentTask !== null) {
    writeWorkspaceFromParent(rootDir, task, parentTask);
  }

  return task;
}

async function executeRunningTask(
  rootDir: string,
  task: AiTaskRecord,
  executor: CodexExecutor
): Promise<CodexExecResult> {
  return executor({
    cwd: path.join(rootDir, task.workspaceProjectPath),
    prompt: task.prompt,
    sandboxMode: task.sandboxMode,
    sessionId: task.sessionId ?? undefined,
    onStdout: task.stdoutPath === null
      ? undefined
      : (chunk) => {
          appendTextArtifact(path.join(rootDir, task.stdoutPath ?? ""), chunk);
        },
    onStderr: task.stderrPath === null
      ? undefined
      : (chunk) => {
          appendTextArtifact(path.join(rootDir, task.stderrPath ?? ""), chunk);
        }
  });
}

function finalizeSuccessfulTask(
  rootDir: string,
  task: AiTaskRecord,
  execResult: CodexExecResult
): AiTaskRecord {
  summarizeManagedTask(rootDir, {
    projectSlug: task.projectSlug,
    taskSlug: task.taskSlug
  });
  validateManagedTask(rootDir, {
    projectSlug: task.projectSlug,
    taskSlug: task.taskSlug
  });
  const taskPaths = getManagedTaskPaths(rootDir, task.projectSlug, task.taskSlug);

  return completeTask(rootDir, task, "completed", {
    ...execResult,
    summaryPath: path.relative(rootDir, taskPaths.summaryPath),
    validationPath: path.relative(rootDir, taskPaths.validationPath)
  });
}

export async function runAiTask(
  rootDir: string,
  taskId: string,
  runnerOptions?: AiTaskRunnerOptions
): Promise<AiTaskRecord> {
  const task = readRequiredAiTask(rootDir, taskId);
  if (task.status !== "queued" && task.status !== "running") {
    return task;
  }

  const runningTask = markTaskRunning(rootDir, task);
  const executor = runnerOptions?.executor ?? runCodexExec;
  let execResult: CodexExecResult;

  try {
    execResult = await executeRunningTask(rootDir, runningTask, executor);
  } catch (error) {
    return completeTask(rootDir, runningTask, "failed", {
      exitCode: null,
      stdout: "",
      stderr: "",
      error: getErrorMessage(error),
      sessionId: runningTask.sessionId
    });
  }

  if (execResult.exitCode !== 0 || execResult.error !== null) {
    return completeTask(rootDir, runningTask, "failed", execResult);
  }

  try {
    return finalizeSuccessfulTask(rootDir, runningTask, execResult);
  } catch (error) {
    return completeTask(rootDir, runningTask, "failed", {
      ...execResult,
      error: getErrorMessage(error)
    });
  }
}

export function readAiTaskSummary(rootDir: string, taskId: string): ManagedTaskSummary | null {
  const task = readRequiredAiTask(rootDir, taskId);
  return readJsonArtifact(rootDir, task.summaryPath, aiTaskSummarySchema);
}

export function readAiTaskDiagnostics(rootDir: string, taskId: string): AiTaskDiagnostics {
  const task = readRequiredAiTask(rootDir, taskId);
  return {
    taskId: task.taskId,
    parentTaskId: task.parentTaskId,
    sessionId: task.sessionId,
    status: task.status,
    codexExitCode: task.codexExitCode,
    error: task.error,
    stdout: readTextArtifact(rootDir, task.stdoutPath),
    stderr: readTextArtifact(rootDir, task.stderrPath)
  };
}

export function applyAiTask(rootDir: string, taskId: string): ManagedTaskApplyResult {
  const task = readRequiredAiTask(rootDir, taskId);
  if (task.status !== "completed") {
    throw new Error(`ai task is not ready to apply: ${taskId}`);
  }
  if (task.validationPath === null || readManagedTaskValidation(rootDir, task.projectSlug, task.taskSlug) === null) {
    throw new Error(`ai task validation not found: ${taskId}`);
  }

  const result = applyManagedTask(rootDir, {
    projectSlug: task.projectSlug,
    taskSlug: task.taskSlug
  });
  writeAiTaskRecord(rootDir, {
    ...task,
    appliedAt: result.lastAppliedAt
  });
  return result;
}

export {
  applyManagedTask,
  listAiTasks,
  readAiTask,
  runCodexExec,
  type AiTaskRecord,
  type CodexExecutor
};
