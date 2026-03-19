import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  getManagedTaskPaths,
  startManagedTask,
  summarizeManagedTask,
  validateManagedTask
} from "@project-manager/project-core";
import { z } from "zod";
import {
  runCodexExec,
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

function buildRunningTask(rootDir: string, input: {
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
    status: "running",
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
    error: null
  };
}

function completeTask(
  rootDir: string,
  task: AiTaskRecord,
  status: "completed" | "failed",
  result: {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    error: string | null;
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
    error: result.error
  });
}

export function createAiTask(
  rootDir: string,
  options: CreateAiTaskOptions,
  runnerOptions?: AiTaskRunnerOptions
): AiTaskRecord {
  const normalizedOptions = createAiTaskOptionsSchema.parse(options);
  const taskId = createTaskId(normalizedOptions.taskSlug);
  const taskResult = startManagedTask(rootDir, {
    projectSlug: normalizedOptions.projectSlug,
    taskSlug: normalizedOptions.taskSlug,
    force: normalizedOptions.force,
    mode: "workspace"
  });
  const runningTask = writeAiTaskRecord(
    rootDir,
    buildRunningTask(rootDir, {
      taskId,
      projectSlug: normalizedOptions.projectSlug,
      taskSlug: normalizedOptions.taskSlug,
      prompt: normalizedOptions.prompt
    })
  );
  const executor = runnerOptions?.executor ?? runCodexExec;
  const execResult = executor({
    cwd: taskResult.workspaceProjectDir,
    prompt: normalizedOptions.prompt
  });

  if (execResult.exitCode !== 0 || execResult.error !== null) {
    return completeTask(rootDir, runningTask, "failed", execResult);
  }

  summarizeManagedTask(rootDir, {
    projectSlug: normalizedOptions.projectSlug,
    taskSlug: normalizedOptions.taskSlug
  });
  validateManagedTask(rootDir, {
    projectSlug: normalizedOptions.projectSlug,
    taskSlug: normalizedOptions.taskSlug
  });
  const taskPaths = getManagedTaskPaths(
    rootDir,
    normalizedOptions.projectSlug,
    normalizedOptions.taskSlug
  );

  return completeTask(rootDir, runningTask, "completed", {
    ...execResult,
    summaryPath: path.relative(rootDir, taskPaths.summaryPath),
    validationPath: path.relative(rootDir, taskPaths.validationPath)
  });
}

export {
  listAiTasks,
  readAiTask,
  runCodexExec,
  type AiTaskRecord,
  type CodexExecutor
};

export const moduleName = "@project-manager/ai-core";
