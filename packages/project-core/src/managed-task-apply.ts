import fs from "node:fs";
import { z } from "zod";
import { getContentRepoRoot, getProjectRoot } from "./content-repo.ts";
import { validateContentRepo } from "./content-repo-validation.ts";
import {
  getManagedTaskPaths,
  type ManagedTaskManifest
} from "./managed-task.ts";
import {
  validateManagedTask,
  type ManagedTaskValidation
} from "./managed-task-validation.ts";
import { slugRe } from "./schemas.ts";

export interface ManagedTaskApplyResult {
  projectSlug: string;
  taskSlug: string;
  changedFiles: number;
  status: "applied";
  lastAppliedAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson<T>(filePath: string, parser: { parse(value: unknown): T }): T {
  const rawValue: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return parser.parse(rawValue);
}

function readManagedTaskManifest(manifestPath: string): ManagedTaskManifest {
  return readJson(manifestPath, z.object({
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
  }));
}

function assertManagedTaskReady(
  manifest: ManagedTaskManifest,
  projectSlug: string,
  taskSlug: string
): void {
  if (manifest.projectSlug !== projectSlug || manifest.taskSlug !== taskSlug) {
    throw new Error(`managed task manifest mismatch: ${projectSlug}/${taskSlug}`);
  }
}

function writeAppliedManifest(
  manifestPath: string,
  manifest: ManagedTaskManifest,
  lastAppliedAt: string
): void {
  writeJson(manifestPath, {
    ...manifest,
    status: "applied",
    lastAppliedAt
  });
}

export function applyManagedTask(
  rootDir: string,
  options: {
    projectSlug: string;
    taskSlug: string;
  }
): ManagedTaskApplyResult {
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

  const manifest = readManagedTaskManifest(taskPaths.manifestPath);
  assertManagedTaskReady(
    manifest,
    normalizedOptions.projectSlug,
    normalizedOptions.taskSlug
  );

  const validation: ManagedTaskValidation = validateManagedTask(rootDir, normalizedOptions);
  const projectRoot = getProjectRoot(rootDir, normalizedOptions.projectSlug);
  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.cpSync(taskPaths.workspaceProjectDir, projectRoot, { recursive: true });
  validateContentRepo(contentRepoRoot);

  const lastAppliedAt = nowIso();
  const validatedManifest = readManagedTaskManifest(taskPaths.manifestPath);
  writeAppliedManifest(taskPaths.manifestPath, validatedManifest, lastAppliedAt);

  return {
    projectSlug: normalizedOptions.projectSlug,
    taskSlug: normalizedOptions.taskSlug,
    changedFiles: validation.changedFiles,
    status: "applied",
    lastAppliedAt
  };
}
