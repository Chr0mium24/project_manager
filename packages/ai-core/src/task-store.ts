import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const aiTaskStatusSchema = z.enum(["queued", "running", "completed", "failed"]);

export const aiTaskRecordSchema = z.object({
  schemaVersion: z.literal(1),
  taskId: z.string().min(1),
  kind: z.literal("managed-project-edit"),
  status: aiTaskStatusSchema,
  projectSlug: z.string().min(1),
  taskSlug: z.string().min(1),
  prompt: z.string().min(1),
  sandboxMode: z.enum(["danger-full-access", "workspace-write"]).default("workspace-write"),
  parentTaskId: z.string().nullable(),
  sessionId: z.string().nullable(),
  createdAt: z.string().min(1),
  completedAt: z.string().nullable(),
  managedTaskPath: z.string().min(1),
  workspaceProjectPath: z.string().min(1),
  stdoutPath: z.string().nullable(),
  stderrPath: z.string().nullable(),
  summaryPath: z.string().nullable(),
  validationPath: z.string().nullable(),
  codexExitCode: z.number().int().nullable(),
  error: z.string().nullable(),
  appliedAt: z.string().nullable()
});

export type AiTaskRecord = z.infer<typeof aiTaskRecordSchema>;
export type AiTaskStatus = z.infer<typeof aiTaskStatusSchema>;

function readJson<T>(filePath: string, schema: z.ZodType<T>): T {
  const rawValue: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return schema.parse(rawValue);
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function getAiTasksRoot(rootDir: string): string {
  return path.join(rootDir, "storage", "ai-tasks");
}

export function getAiTaskRoot(rootDir: string, taskId: string): string {
  return path.join(getAiTasksRoot(rootDir), taskId);
}

export function getAiTaskPath(rootDir: string, taskId: string): string {
  return path.join(getAiTaskRoot(rootDir, taskId), "task.json");
}

export function writeAiTaskRecord(rootDir: string, task: AiTaskRecord): AiTaskRecord {
  writeJson(getAiTaskPath(rootDir, task.taskId), task);
  return task;
}

export function readAiTask(rootDir: string, taskId: string): AiTaskRecord | null {
  const taskPath = getAiTaskPath(rootDir, taskId);
  if (!fs.existsSync(taskPath) || !fs.statSync(taskPath).isFile()) {
    return null;
  }

  return readJson(taskPath, aiTaskRecordSchema);
}

export function listAiTasks(rootDir: string): AiTaskRecord[] {
  const tasksRoot = getAiTasksRoot(rootDir);
  if (!fs.existsSync(tasksRoot) || !fs.statSync(tasksRoot).isDirectory()) {
    return [];
  }

  return fs.readdirSync(tasksRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readAiTask(rootDir, entry.name))
    .filter((task): task is AiTaskRecord => task !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
