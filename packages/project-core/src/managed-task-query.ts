import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  getManagedTaskPaths,
  getManagedTasksRoot,
  type ManagedTaskManifest
} from "./managed-task.ts";
import { slugRe } from "./schemas.ts";

const managedTaskManifestSchema = z.object({
  schemaVersion: z.literal(1),
  projectSlug: z.string().regex(slugRe),
  taskSlug: z.string().regex(slugRe),
  mode: z.enum(["workspace", "git-branch"]),
  targetCount: z.literal(1),
  sourceProjectPath: z.string().min(1),
  workspaceProjectPath: z.string().min(1),
  runtime: z.enum(["static", "dynamic"]),
  entry: z.string().min(1),
  route: z.string().min(1),
  branchName: z.string().nullable(),
  commitPolicy: z.literal("final-result-only"),
  prPolicy: z.literal("forbidden"),
  createdAt: z.string().min(1),
  status: z.enum(["validated", "applied"]).optional(),
  lastValidatedAt: z.string().min(1).optional(),
  lastAppliedAt: z.string().min(1).optional()
});

function readManagedTaskManifestFile(manifestPath: string): ManagedTaskManifest | null {
  if (!fs.existsSync(manifestPath) || !fs.statSync(manifestPath).isFile()) {
    return null;
  }

  const rawValue: unknown = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  return managedTaskManifestSchema.parse(rawValue);
}

export function readManagedTask(
  rootDir: string,
  projectSlug: string,
  taskSlug: string
): ManagedTaskManifest | null {
  const taskPaths = getManagedTaskPaths(rootDir, projectSlug, taskSlug);
  return readManagedTaskManifestFile(taskPaths.manifestPath);
}

export function listManagedTasks(rootDir: string, projectSlug: string): ManagedTaskManifest[] {
  const projectTasksRoot = path.join(getManagedTasksRoot(rootDir), projectSlug);
  if (!fs.existsSync(projectTasksRoot) || !fs.statSync(projectTasksRoot).isDirectory()) {
    return [];
  }

  return fs.readdirSync(projectTasksRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readManagedTask(rootDir, projectSlug, entry.name))
    .filter((manifest): manifest is ManagedTaskManifest => manifest !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
