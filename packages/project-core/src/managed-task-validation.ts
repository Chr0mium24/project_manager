import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { getContentRepoRoot } from "./content-repo.ts";
import { validateContentRepo } from "./content-repo-validation.ts";
import {
  getManagedTaskPaths,
  summarizeManagedTask,
  type ManagedTaskManifest,
  type ManagedTaskSummary
} from "./managed-task.ts";
import { projectJsonSchema, slugRe } from "./schemas.ts";

export interface ManagedTaskValidation {
  schemaVersion: 1;
  projectSlug: string;
  taskSlug: string;
  checkedAt: string;
  status: "validated";
  changedFiles: number;
  summaryPath: string;
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

function assertManagedTaskWorkspace(taskRoot: string, manifestPath: string, workspaceProjectDir: string): void {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`managed task manifest not found: ${taskRoot}`);
  }
  if (!fs.existsSync(workspaceProjectDir)) {
    throw new Error(`managed task workspace not found: ${taskRoot}`);
  }
}

function assertManifestMatchesTask(
  manifest: ManagedTaskManifest,
  projectSlug: string,
  taskSlug: string
): void {
  if (manifest.projectSlug !== projectSlug || manifest.taskSlug !== taskSlug) {
    throw new Error(`managed task manifest mismatch: ${projectSlug}/${taskSlug}`);
  }
}

function buildWorkspaceValidationRepo(
  validationRepoRoot: string,
  workspaceProjectDir: string,
  checkedAt: string
): void {
  const workspaceProject = readJson(
    path.join(workspaceProjectDir, "project.json"),
    projectJsonSchema
  );

  fs.rmSync(validationRepoRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(validationRepoRoot, "projects"), { recursive: true });
  fs.cpSync(
    workspaceProjectDir,
    path.join(validationRepoRoot, "projects", workspaceProject.slug),
    { recursive: true }
  );
  writeJson(path.join(validationRepoRoot, "projects-index.json"), {
    version: 1,
    generatedAt: checkedAt,
    projects: [
      {
        slug: workspaceProject.slug,
        path: `projects/${workspaceProject.slug}`,
        name: workspaceProject.name,
        runtime: workspaceProject.runtime,
        visibility: workspaceProject.visibility,
        entry: workspaceProject.entry,
        route: workspaceProject.route,
        updatedAt: workspaceProject.updatedAt
      }
    ]
  });
}

function writeValidatedManifest(
  manifestPath: string,
  manifest: ManagedTaskManifest,
  checkedAt: string
): void {
  writeJson(manifestPath, {
    ...manifest,
    status: "validated",
    lastValidatedAt: checkedAt
  });
}

function writeValidationArtifact(
  rootDir: string,
  validationPath: string,
  summary: ManagedTaskSummary,
  checkedAt: string
): ManagedTaskValidation {
  const artifact: ManagedTaskValidation = {
    schemaVersion: 1,
    projectSlug: summary.projectSlug,
    taskSlug: summary.taskSlug,
    checkedAt,
    status: "validated",
    changedFiles: summary.changedFiles,
    summaryPath: path.relative(rootDir, validationPath.replace(/validation\.json$/, "summary.json"))
  };
  writeJson(validationPath, artifact);
  return artifact;
}

export function validateManagedTask(
  rootDir: string,
  options: {
    projectSlug: string;
    taskSlug: string;
  }
): ManagedTaskValidation {
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
  assertManagedTaskWorkspace(
    `${normalizedOptions.projectSlug}/${normalizedOptions.taskSlug}`,
    taskPaths.manifestPath,
    taskPaths.workspaceProjectDir
  );

  const manifest = readManagedTaskManifest(taskPaths.manifestPath);
  assertManifestMatchesTask(
    manifest,
    normalizedOptions.projectSlug,
    normalizedOptions.taskSlug
  );

  const summary = summarizeManagedTask(rootDir, normalizedOptions);
  const checkedAt = nowIso();
  buildWorkspaceValidationRepo(
    path.join(taskPaths.taskRoot, ".validation-repo"),
    taskPaths.workspaceProjectDir,
    checkedAt
  );
  validateContentRepo(path.join(taskPaths.taskRoot, ".validation-repo"));
  writeValidatedManifest(taskPaths.manifestPath, manifest, checkedAt);

  return writeValidationArtifact(rootDir, taskPaths.validationPath, summary, checkedAt);
}
