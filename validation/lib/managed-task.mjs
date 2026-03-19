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

function listFiles(rootDir, currentDir = rootDir, result = []) {
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

function getTaskPaths(validationRoot, projectSlug, taskSlug) {
  const tasksRoot = path.join(validationRoot, "tmp", "managed-tasks");
  const taskRoot = path.join(tasksRoot, projectSlug, taskSlug);
  const workspaceRoot = path.join(taskRoot, "workspace");
  const workspaceProjectDir = path.join(workspaceRoot, projectSlug);
  const manifestPath = path.join(taskRoot, "task.json");
  const summaryPath = path.join(taskRoot, "summary.json");
  const validationPath = path.join(taskRoot, "validation.json");

  return {
    taskRoot,
    workspaceRoot,
    workspaceProjectDir,
    manifestPath,
    summaryPath,
    validationPath
  };
}

function summarizeProjectDiff(sourceProjectDir, workspaceProjectDir) {
  const sourceFiles = new Set(listFiles(sourceProjectDir));
  const workspaceFiles = new Set(listFiles(workspaceProjectDir));
  const allFiles = [...new Set([...sourceFiles, ...workspaceFiles])].sort();
  const changes = [];

  for (const relativePath of allFiles) {
    const sourcePath = path.join(sourceProjectDir, relativePath);
    const workspacePath = path.join(workspaceProjectDir, relativePath);
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

  const validation = validateManagedTask(validationRoot, {
    contentRepoRoot,
    projectSlug,
    taskSlug
  });

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
    changedFiles: validation.changedFiles,
    status: appliedManifest.status,
    lastAppliedAt: appliedManifest.lastAppliedAt
  };
}

export function summarizeManagedTask(validationRoot, options) {
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
    summaryPath,
    workspaceProjectDir
  } = getTaskPaths(validationRoot, projectSlug, taskSlug);

  assert(fs.existsSync(manifestPath), `managed task manifest not found: ${projectSlug}/${taskSlug}`);
  assert(fs.existsSync(workspaceProjectDir), `managed task workspace not found: ${projectSlug}/${taskSlug}`);

  const manifest = readJson(manifestPath);
  assert(manifest.projectSlug === projectSlug, "managed task manifest projectSlug mismatch");
  assert(manifest.taskSlug === taskSlug, "managed task manifest taskSlug mismatch");
  assert(manifest.targetCount === 1, "managed task must target exactly one project");

  const summary = {
    projectSlug,
    taskSlug,
    generatedAt: nowIso(),
    ...summarizeProjectDiff(projectDir, workspaceProjectDir)
  };
  writeJson(summaryPath, summary);
  return summary;
}

export function validateManagedTask(validationRoot, options) {
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
    summaryPath,
    validationPath,
    workspaceProjectDir
  } = getTaskPaths(validationRoot, projectSlug, taskSlug);

  assert(fs.existsSync(manifestPath), `managed task manifest not found: ${projectSlug}/${taskSlug}`);
  assert(fs.existsSync(workspaceProjectDir), `managed task workspace not found: ${projectSlug}/${taskSlug}`);

  const manifest = readJson(manifestPath);
  assert(manifest.projectSlug === projectSlug, "managed task manifest projectSlug mismatch");
  assert(manifest.taskSlug === taskSlug, "managed task manifest taskSlug mismatch");
  assert(manifest.targetCount === 1, "managed task must target exactly one project");

  const workspaceProjectJsonPath = path.join(workspaceProjectDir, "project.json");
  assert(fs.existsSync(workspaceProjectJsonPath), `managed task workspace project.json is missing: ${projectSlug}/${taskSlug}`);

  const workspaceProject = readJson(workspaceProjectJsonPath);
  const summary = {
    projectSlug,
    taskSlug,
    generatedAt: nowIso(),
    ...summarizeProjectDiff(projectDir, workspaceProjectDir)
  };
  writeJson(summaryPath, summary);

  const tempRepoRoot = path.join(validationRoot, "tmp", "managed-tasks", projectSlug, taskSlug, ".validation-repo");
  fs.rmSync(tempRepoRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(tempRepoRoot, "projects"), { recursive: true });
  fs.cpSync(workspaceProjectDir, path.join(tempRepoRoot, "projects", projectSlug), { recursive: true });
  writeJson(path.join(tempRepoRoot, "projects-index.json"), {
    version: 1,
    generatedAt: nowIso(),
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
  validateContentRepo(tempRepoRoot);

  const validatedManifest = {
    ...manifest,
    lastValidatedAt: nowIso(),
    status: "validated"
  };
  writeJson(manifestPath, validatedManifest);

  const validation = {
    schemaVersion: 1,
    projectSlug,
    taskSlug,
    checkedAt: validatedManifest.lastValidatedAt,
    status: validatedManifest.status,
    changedFiles: summary.changedFiles,
    summaryPath: path.relative(validationRoot, summaryPath)
  };
  writeJson(validationPath, validation);

  return validation;
}
