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
}

export interface AiTaskRunnerOptions {
  executor?: CodexExecutor;
}

const createAiTaskOptionsSchema = z.object({
  projectSlug: z.string().min(1),
  taskSlug: z.string().min(1),
  prompt: z.string().min(1),
  force: z.boolean().optional()
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

function writeText(filePath: string, value: string): string {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
  return filePath;
}

function createTaskId(taskSlug: string): string {
  return `${taskSlug}-${randomUUID().slice(0, 8)}`;
}

function buildQueuedTask(rootDir: string, input: {
  taskId: string;
  projectSlug: string;
  taskSlug: string;
  prompt: string;
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
  const stdoutPath = writeText(path.join(taskRoot, "stdout.log"), result.stdout);
  const stderrPath = writeText(path.join(taskRoot, "stderr.log"), result.stderr);

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
    appliedAt: task.appliedAt
  });
}

function readRequiredAiTask(rootDir: string, taskId: string): AiTaskRecord {
  const task = readAiTask(rootDir, taskId);
  if (task === null) {
    throw new Error(`ai task not found: ${taskId}`);
  }

  return task;
}

function readAiTaskArtifact<T>(
  rootDir: string,
  relativePath: string | null,
  schema: z.ZodType<T>
): T | null {
  if (relativePath === null) {
    return null;
  }

  const artifactPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(artifactPath) || !fs.statSync(artifactPath).isFile()) {
    return null;
  }

  const rawValue: unknown = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  return schema.parse(rawValue);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown ai task error";
}

export function createAiTask(
  rootDir: string,
  options: CreateAiTaskOptions
): AiTaskRecord {
  const normalizedOptions = createAiTaskOptionsSchema.parse(options);
  const taskId = createTaskId(normalizedOptions.taskSlug);
  startManagedTask(rootDir, {
    projectSlug: normalizedOptions.projectSlug,
    taskSlug: normalizedOptions.taskSlug,
    force: normalizedOptions.force,
    mode: "workspace"
  });
  return writeAiTaskRecord(
    rootDir,
    buildQueuedTask(rootDir, {
      taskId,
      projectSlug: normalizedOptions.projectSlug,
      taskSlug: normalizedOptions.taskSlug,
      prompt: normalizedOptions.prompt
    })
  );
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

  const runningTask = writeAiTaskRecord(rootDir, {
    ...task,
    status: "running"
  });
  const executor = runnerOptions?.executor ?? runCodexExec;
  const workspaceProjectDir = path.join(rootDir, runningTask.workspaceProjectPath);
  let execResult: CodexExecResult;

  try {
    execResult = await executor({
      cwd: workspaceProjectDir,
      prompt: runningTask.prompt
    });
  } catch (error) {
    return completeTask(rootDir, runningTask, "failed", {
      exitCode: null,
      stdout: "",
      stderr: "",
      error: getErrorMessage(error)
    });
  }

  if (execResult.exitCode !== 0 || execResult.error !== null) {
    return completeTask(rootDir, runningTask, "failed", execResult);
  }

  try {
    summarizeManagedTask(rootDir, {
      projectSlug: runningTask.projectSlug,
      taskSlug: runningTask.taskSlug
    });
    validateManagedTask(rootDir, {
      projectSlug: runningTask.projectSlug,
      taskSlug: runningTask.taskSlug
    });
    const taskPaths = getManagedTaskPaths(
      rootDir,
      runningTask.projectSlug,
      runningTask.taskSlug
    );

    return completeTask(rootDir, runningTask, "completed", {
      ...execResult,
      summaryPath: path.relative(rootDir, taskPaths.summaryPath),
      validationPath: path.relative(rootDir, taskPaths.validationPath)
    });
  } catch (error) {
    return completeTask(rootDir, runningTask, "failed", {
      ...execResult,
      error: getErrorMessage(error)
    });
  }
}

export function readAiTaskSummary(rootDir: string, taskId: string): ManagedTaskSummary | null {
  const task = readRequiredAiTask(rootDir, taskId);
  return readAiTaskArtifact(rootDir, task.summaryPath, aiTaskSummarySchema);
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
