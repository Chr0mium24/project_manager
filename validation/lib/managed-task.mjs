import fs from "node:fs";
import path from "node:path";
import {
  MANAGED_TASK_MODES,
  SLUG_RE,
  assert
} from "./contracts.mjs";

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
  const tasksRoot = path.join(validationRoot, "tmp", "managed-tasks");
  const taskRoot = path.join(tasksRoot, projectSlug, taskSlug);
  const workspaceRoot = path.join(taskRoot, "workspace");
  const workspaceProjectDir = path.join(workspaceRoot, projectSlug);
  const manifestPath = path.join(taskRoot, "task.json");

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
