import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  getContentRepoRoot,
  getProjectJsonPath,
  getProjectRoot,
  readProject
} from "./content-repo.ts";
import { validateContentRepo } from "./content-repo-validation.ts";
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
  summaryPath: string;
}

export interface StartManagedTaskResult extends ManagedTaskPaths {
  manifest: ManagedTaskManifest;
}

export interface ManagedTaskChange {
  path: string;
  kind: "added" | "deleted" | "modified";
}

export interface ManagedTaskSummary {
  projectSlug: string;
  taskSlug: string;
  generatedAt: string;
  changedFiles: number;
  changes: ManagedTaskChange[];
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
  const summaryPath = path.join(taskRoot, "summary.json");

  return {
    taskRoot,
    workspaceRoot,
    workspaceProjectDir,
    manifestPath,
    summaryPath
  };
}

function readJson<T>(filePath: string, parser: { parse(value: unknown): T }): T {
  const rawValue: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return parser.parse(rawValue);
}

function listFiles(rootDir: string, currentDir: string = rootDir, result: string[] = []): string[] {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      listFiles(rootDir, fullPath, result);
      continue;
    }

    if (entry.isFile()) {
      result.push(path.relative(rootDir, fullPath));
    }
  }

  return result.sort();
}

function summarizeProjectDiff(
  sourceProjectDir: string,
  workspaceProjectDir: string
): Pick<ManagedTaskSummary, "changedFiles" | "changes"> {
  const sourceFiles = new Set(listFiles(sourceProjectDir));
  const workspaceFiles = new Set(listFiles(workspaceProjectDir));
  const allFiles = [...new Set([...sourceFiles, ...workspaceFiles])].sort();
  const changes: ManagedTaskChange[] = [];

  for (const relativePath of allFiles) {
    const sourceExists = sourceFiles.has(relativePath);
    const workspaceExists = workspaceFiles.has(relativePath);

    if (!sourceExists && workspaceExists) {
      changes.push({ path: relativePath, kind: "added" });
      continue;
    }

    if (sourceExists && !workspaceExists) {
      changes.push({ path: relativePath, kind: "deleted" });
      continue;
    }

    const sourcePath = path.join(sourceProjectDir, relativePath);
    const workspacePath = path.join(workspaceProjectDir, relativePath);
    const sourceContent = fs.readFileSync(sourcePath, "utf8");
    const workspaceContent = fs.readFileSync(workspacePath, "utf8");
    if (sourceContent !== workspaceContent) {
      changes.push({ path: relativePath, kind: "modified" });
    }
  }

  return {
    changedFiles: changes.length,
    changes
  };
}

function readManagedTaskManifest(taskPaths: ManagedTaskPaths): ManagedTaskManifest {
  return readJson(taskPaths.manifestPath, z.object({
    schemaVersion: z.literal(1),
    projectSlug: z.string().regex(slugRe),
    taskSlug: z.string().regex(slugRe),
    mode: managedTaskModeSchema,
    targetCount: z.literal(1),
    sourceProjectPath: z.string().min(1),
    workspaceProjectPath: z.string().min(1),
    runtime: z.enum(["static", "dynamic"]),
    entry: z.string().min(1),
    route: z.string().min(1),
    branchName: z.string().nullable(),
    commitPolicy: z.literal("final-result-only"),
    prPolicy: z.literal("forbidden"),
    createdAt: z.string().min(1)
  }));
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

export function summarizeManagedTask(
  rootDir: string,
  options: Pick<StartManagedTaskOptions, "projectSlug" | "taskSlug">
): ManagedTaskSummary {
  const normalizedOptions = z.object({
    projectSlug: z.string().regex(slugRe),
    taskSlug: z.string().regex(slugRe)
  }).parse(options);

  const contentRepoRoot = getContentRepoRoot(rootDir);
  validateContentRepo(contentRepoRoot);

  const taskPaths = getManagedTaskPaths(
    rootDir,
    normalizedOptions.projectSlug,
    normalizedOptions.taskSlug
  );
  if (!fs.existsSync(taskPaths.manifestPath)) {
    throw new Error(
      `managed task manifest not found: ${normalizedOptions.projectSlug}/${normalizedOptions.taskSlug}`
    );
  }
  if (!fs.existsSync(taskPaths.workspaceProjectDir)) {
    throw new Error(
      `managed task workspace not found: ${normalizedOptions.projectSlug}/${normalizedOptions.taskSlug}`
    );
  }

  const manifest = readManagedTaskManifest(taskPaths);
  if (
    manifest.projectSlug !== normalizedOptions.projectSlug ||
    manifest.taskSlug !== normalizedOptions.taskSlug
  ) {
    throw new Error(
      `managed task manifest mismatch: ${normalizedOptions.projectSlug}/${normalizedOptions.taskSlug}`
    );
  }

  const summary: ManagedTaskSummary = {
    projectSlug: normalizedOptions.projectSlug,
    taskSlug: normalizedOptions.taskSlug,
    generatedAt: nowIso(),
    ...summarizeProjectDiff(
      getProjectRoot(rootDir, normalizedOptions.projectSlug),
      taskPaths.workspaceProjectDir
    )
  };
  writeJson(taskPaths.summaryPath, summary);
  return summary;
}
