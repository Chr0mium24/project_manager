import fs from "node:fs";
import path from "node:path";
import {
  MANAGED_TASK_MODES,
  SLUG_RE,
  assert
} from "./contracts.mjs";
import { validateContentRepo } from "./validators.mjs";

function nowIso() {
  return new Date().toISOString();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function getBranchName(projectSlug, taskSlug) {
  return `task/${projectSlug}--${taskSlug}`;
}

function getTaskPaths(validationRoot, projectSlug, taskSlug) {
  const tasksRoot = path.join(validationRoot, "tmp", "managed-tasks");
  const taskRoot = path.join(tasksRoot, projectSlug, taskSlug);
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

export function startManagedTask(validationRoot, options) {
  const {
    contentRepoRoot,
    projectSlug,
    taskSlug,
    mode = "workspace",
    force = false
  } = options;

  assert(typeof contentRepoRoot === "string" && contentRepoRoot.length > 0, "contentRepoRoot is required");
  assert(typeof projectSlug === "string" && SLUG_RE.test(projectSlug), "projectSlug is invalid");
  assert(typeof taskSlug === "string" && SLUG_RE.test(taskSlug), "taskSlug is invalid");
  assert(typeof mode === "string" && MANAGED_TASK_MODES.has(mode), "mode is invalid");

  const projectDir = path.join(contentRepoRoot, "projects", projectSlug);
  const projectJsonPath = path.join(projectDir, "project.json");
  assert(fs.existsSync(projectJsonPath), `managed project not found: ${projectSlug}`);

  const projectJson = readJson(projectJsonPath);
  const {
    taskRoot,
    workspaceRoot,
    workspaceProjectDir,
    manifestPath
  } = getTaskPaths(validationRoot, projectSlug, taskSlug);

  if (!force) {
    assert(!fs.existsSync(taskRoot), `managed task already exists: ${projectSlug}/${taskSlug}`);
  }

  fs.mkdirSync(taskRoot, { recursive: true });
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
  fs.mkdirSync(workspaceRoot, { recursive: true });
  fs.cpSync(projectDir, workspaceProjectDir, { recursive: true });

  const manifest = {
    schemaVersion: 1,
    projectSlug,
    taskSlug,
    mode,
    targetCount: 1,
    sourceProjectPath: path.relative(validationRoot, projectDir),
    workspaceProjectPath: path.relative(validationRoot, workspaceProjectDir),
    runtime: projectJson.runtime,
    entry: projectJson.entry,
    route: projectJson.route,
    branchName: mode === "git-branch" ? getBranchName(projectSlug, taskSlug) : null,
    commitPolicy: "final-result-only",
    prPolicy: "forbidden",
    createdAt: nowIso()
  };

  writeJson(manifestPath, manifest);

  return {
    taskRoot,
    manifestPath,
    manifest
  };
}

export function applyManagedTask(validationRoot, options) {
  const {
    contentRepoRoot,
    projectSlug,
    taskSlug
  } = options;

  assert(typeof contentRepoRoot === "string" && contentRepoRoot.length > 0, "contentRepoRoot is required");
  assert(typeof projectSlug === "string" && SLUG_RE.test(projectSlug), "projectSlug is invalid");
  assert(typeof taskSlug === "string" && SLUG_RE.test(taskSlug), "taskSlug is invalid");

  const projectDir = path.join(contentRepoRoot, "projects", projectSlug);
  const {
    manifestPath,
    workspaceProjectDir
  } = getTaskPaths(validationRoot, projectSlug, taskSlug);

  assert(fs.existsSync(manifestPath), `managed task manifest not found: ${projectSlug}/${taskSlug}`);
  assert(fs.existsSync(workspaceProjectDir), `managed task workspace not found: ${projectSlug}/${taskSlug}`);

  const manifest = readJson(manifestPath);
  assert(manifest.projectSlug === projectSlug, "managed task manifest projectSlug mismatch");
  assert(manifest.taskSlug === taskSlug, "managed task manifest taskSlug mismatch");
  assert(manifest.targetCount === 1, "managed task must target exactly one project");
  assert(manifest.prPolicy === "forbidden", "managed task PR policy must remain forbidden");

  fs.rmSync(projectDir, { recursive: true, force: true });
  fs.cpSync(workspaceProjectDir, projectDir, { recursive: true });
  validateContentRepo(contentRepoRoot);

  const appliedManifest = {
    ...manifest,
    lastAppliedAt: nowIso(),
    status: "applied"
  };
  writeJson(manifestPath, appliedManifest);

  return {
    projectSlug,
    taskSlug,
    status: appliedManifest.status,
    lastAppliedAt: appliedManifest.lastAppliedAt
  };
}
