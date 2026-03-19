import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  getContentRepoRoot,
  getProjectJsonPath,
  getProjectRoot,
  readProject,
  validateContentRepo
} from "./index.ts";
import { slugRe } from "./schemas.ts";

const managedTaskModeSchema = z.enum(["workspace", "git-branch"]);

export interface StartManagedTaskOptions {
  projectSlug: string;
  taskSlug: string;
  mode?: "workspace" | "git-branch";
  force?: boolean;
}

export interface ManagedTaskManifest {
  schemaVersion: 1;
  projectSlug: string;
  taskSlug: string;
  mode: "workspace" | "git-branch";
  targetCount: 1;
  sourceProjectPath: string;
  workspaceProjectPath: string;
  runtime: "static" | "dynamic";
  entry: string;
  route: string;
  branchName: string | null;
  commitPolicy: "final-result-only";
  prPolicy: "forbidden";
  createdAt: string;
}

export interface ManagedTaskPaths {
  taskRoot: string;
  workspaceRoot: string;
  workspaceProjectDir: string;
  manifestPath: string;
}

export interface StartManagedTaskResult extends ManagedTaskPaths {
  manifest: ManagedTaskManifest;
}

function nowIso(): string {
  return new Date().toISOString();
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function getBranchName(projectSlug: string, taskSlug: string): string {
  return `task/${projectSlug}--${taskSlug}`;
}

export function getManagedTasksRoot(rootDir: string): string {
  return path.join(rootDir, "storage", "managed-tasks");
}

export function getManagedTaskPaths(
  rootDir: string,
  projectSlug: string,
  taskSlug: string
): ManagedTaskPaths {
  const taskRoot = path.join(getManagedTasksRoot(rootDir), projectSlug, taskSlug);
  const workspaceRoot = path.join(taskRoot, "workspace");
  const workspaceProjectDir = path.join(workspaceRoot, projectSlug);
  const manifestPath = path.join(taskRoot, "task.json");

  return {
    taskRoot,
    workspaceRoot,
    workspaceProjectDir,
    manifestPath
  };
}

export function startManagedTask(
  rootDir: string,
  options: StartManagedTaskOptions
): StartManagedTaskResult {
  const normalizedOptions = z.object({
    projectSlug: z.string().regex(slugRe),
    taskSlug: z.string().regex(slugRe),
    mode: managedTaskModeSchema.default("workspace"),
    force: z.boolean().default(false)
  }).parse(options);

  const contentRepoRoot = getContentRepoRoot(rootDir);
  validateContentRepo(contentRepoRoot);

  const sourceProjectJsonPath = getProjectJsonPath(rootDir, normalizedOptions.projectSlug);
  if (!fs.existsSync(sourceProjectJsonPath)) {
    throw new Error(`managed project not found: ${normalizedOptions.projectSlug}`);
  }

  const project = readProject(rootDir, normalizedOptions.projectSlug);
  if (project === null) {
    throw new Error(`managed project not readable: ${normalizedOptions.projectSlug}`);
  }

  const sourceProjectDir = getProjectRoot(rootDir, normalizedOptions.projectSlug);
  const taskPaths = getManagedTaskPaths(
    rootDir,
    normalizedOptions.projectSlug,
    normalizedOptions.taskSlug
  );

  if (fs.existsSync(taskPaths.taskRoot) && !normalizedOptions.force) {
    throw new Error(
      `managed task already exists: ${normalizedOptions.projectSlug}/${normalizedOptions.taskSlug}`
    );
  }

  fs.rmSync(taskPaths.taskRoot, { recursive: true, force: true });
  fs.mkdirSync(taskPaths.workspaceRoot, { recursive: true });
  fs.cpSync(sourceProjectDir, taskPaths.workspaceProjectDir, { recursive: true });

  const manifest: ManagedTaskManifest = {
    schemaVersion: 1,
    projectSlug: normalizedOptions.projectSlug,
    taskSlug: normalizedOptions.taskSlug,
    mode: normalizedOptions.mode,
    targetCount: 1,
    sourceProjectPath: path.relative(rootDir, sourceProjectDir),
    workspaceProjectPath: path.relative(rootDir, taskPaths.workspaceProjectDir),
    runtime: project.runtime,
    entry: project.entry,
    route: project.route,
    branchName:
      normalizedOptions.mode === "git-branch"
        ? getBranchName(normalizedOptions.projectSlug, normalizedOptions.taskSlug)
        : null,
    commitPolicy: "final-result-only",
    prPolicy: "forbidden",
    createdAt: nowIso()
  };

  writeJson(taskPaths.manifestPath, manifest);

  return {
    ...taskPaths,
    manifest
  };
}
