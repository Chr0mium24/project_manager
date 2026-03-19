import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyManagedTask,
  startManagedTask,
  summarizeManagedTask,
  validateManagedTask
} from "../lib/managed-task.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureRepo = path.resolve(currentDir, "..", "content-repo");

function copyDir(source, target) {
  fs.cpSync(source, target, { recursive: true });
}

test("startManagedTask creates an isolated workspace and manifest", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-managed-task-"));
  const validationRoot = path.join(tempRoot, "validation");
  const repo = path.join(validationRoot, "content-repo");

  fs.mkdirSync(validationRoot, { recursive: true });
  copyDir(fixtureRepo, repo);

  const result = startManagedTask(validationRoot, {
    contentRepoRoot: repo,
    projectSlug: "landing-a",
    taskSlug: "fix-copy",
    mode: "workspace"
  });

  assert.equal(result.manifest.projectSlug, "landing-a");
  assert.equal(result.manifest.taskSlug, "fix-copy");
  assert.equal(result.manifest.targetCount, 1);
  assert.equal(result.manifest.commitPolicy, "final-result-only");
  assert.equal(result.manifest.prPolicy, "forbidden");
  assert.equal(result.manifest.branchName, null);
  assert.equal(fs.existsSync(result.manifestPath), true);
  assert.equal(
    fs.existsSync(path.join(validationRoot, result.manifest.workspaceProjectPath, "project.json")),
    true
  );
});

test("startManagedTask produces branch metadata for git-branch mode", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-managed-task-"));
  const validationRoot = path.join(tempRoot, "validation");
  const repo = path.join(validationRoot, "content-repo");

  fs.mkdirSync(validationRoot, { recursive: true });
  copyDir(fixtureRepo, repo);

  const result = startManagedTask(validationRoot, {
    contentRepoRoot: repo,
    projectSlug: "service-b",
    taskSlug: "fix-handler",
    mode: "git-branch"
  });

  assert.equal(result.manifest.branchName, "task/service-b--fix-handler");
  assert.equal(result.manifest.prPolicy, "forbidden");
});

test("startManagedTask rejects unknown managed project", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-managed-task-"));
  const validationRoot = path.join(tempRoot, "validation");
  const repo = path.join(validationRoot, "content-repo");

  fs.mkdirSync(validationRoot, { recursive: true });
  copyDir(fixtureRepo, repo);

  assert.throws(() => {
    startManagedTask(validationRoot, {
      contentRepoRoot: repo,
      projectSlug: "missing-project",
      taskSlug: "fix-copy",
      mode: "workspace"
    });
  }, /managed project not found/);
});

test("startManagedTask with force recreates a clean task directory", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-managed-task-"));
  const validationRoot = path.join(tempRoot, "validation");
  const repo = path.join(validationRoot, "content-repo");

  fs.mkdirSync(validationRoot, { recursive: true });
  copyDir(fixtureRepo, repo);

  const started = startManagedTask(validationRoot, {
    contentRepoRoot: repo,
    projectSlug: "landing-a",
    taskSlug: "redo-copy",
    mode: "workspace"
  });

  fs.writeFileSync(path.join(started.taskRoot, "summary.json"), '{"stale":true}\n', "utf8");
  fs.writeFileSync(path.join(started.taskRoot, "validation.json"), '{"stale":true}\n', "utf8");

  const restarted = startManagedTask(validationRoot, {
    contentRepoRoot: repo,
    projectSlug: "landing-a",
    taskSlug: "redo-copy",
    mode: "workspace",
    force: true
  });

  assert.equal(fs.existsSync(path.join(restarted.taskRoot, "summary.json")), false);
  assert.equal(fs.existsSync(path.join(restarted.taskRoot, "validation.json")), false);
  assert.equal(fs.existsSync(restarted.manifestPath), true);
});

test("applyManagedTask copies workspace changes back to the target project", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-managed-task-"));
  const validationRoot = path.join(tempRoot, "validation");
  const repo = path.join(validationRoot, "content-repo");

  fs.mkdirSync(validationRoot, { recursive: true });
  copyDir(fixtureRepo, repo);

  const started = startManagedTask(validationRoot, {
    contentRepoRoot: repo,
    projectSlug: "landing-a",
    taskSlug: "fix-copy",
    mode: "workspace"
  });

  const workspaceHtmlPath = path.join(
    validationRoot,
    started.manifest.workspaceProjectPath,
    "src/index.html"
  );
  fs.writeFileSync(workspaceHtmlPath, "<!doctype html>\n<html><body><h1>Updated</h1></body></html>\n", "utf8");

  const applied = applyManagedTask(validationRoot, {
    contentRepoRoot: repo,
    projectSlug: "landing-a",
    taskSlug: "fix-copy"
  });

  const targetHtmlPath = path.join(repo, "projects/landing-a/src/index.html");
  const targetHtml = fs.readFileSync(targetHtmlPath, "utf8");
  const manifest = JSON.parse(fs.readFileSync(started.manifestPath, "utf8"));
  const summary = JSON.parse(
    fs.readFileSync(path.join(started.taskRoot, "summary.json"), "utf8")
  );
  const validation = JSON.parse(
    fs.readFileSync(path.join(started.taskRoot, "validation.json"), "utf8")
  );

  assert.equal(applied.status, "applied");
  assert.equal(applied.changedFiles, 1);
  assert.match(targetHtml, /Updated/);
  assert.equal(manifest.status, "applied");
  assert.equal(typeof manifest.lastAppliedAt, "string");
  assert.equal(summary.changedFiles, 1);
  assert.deepEqual(summary.changes, [{ path: "src/index.html", kind: "modified" }]);
  assert.equal(validation.status, "validated");
  assert.equal(validation.changedFiles, 1);
});

test("applyManagedTask rejects missing task manifests", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-managed-task-"));
  const validationRoot = path.join(tempRoot, "validation");
  const repo = path.join(validationRoot, "content-repo");

  fs.mkdirSync(validationRoot, { recursive: true });
  copyDir(fixtureRepo, repo);

  assert.throws(() => {
    applyManagedTask(validationRoot, {
      contentRepoRoot: repo,
      projectSlug: "landing-a",
      taskSlug: "missing-task"
    });
  }, /managed task manifest not found/);
});

test("summarizeManagedTask writes a summary without applying changes", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-managed-task-"));
  const validationRoot = path.join(tempRoot, "validation");
  const repo = path.join(validationRoot, "content-repo");

  fs.mkdirSync(validationRoot, { recursive: true });
  copyDir(fixtureRepo, repo);

  const started = startManagedTask(validationRoot, {
    contentRepoRoot: repo,
    projectSlug: "service-b",
    taskSlug: "summarize-handler",
    mode: "workspace"
  });

  const workspaceServerPath = path.join(
    validationRoot,
    started.manifest.workspaceProjectPath,
    "src/server.ts"
  );
  fs.writeFileSync(
    workspaceServerPath,
    'export function handler() {\n  return { ok: true, name: "service-b", version: 2 };\n}\n',
    "utf8"
  );

  const summary = summarizeManagedTask(validationRoot, {
    contentRepoRoot: repo,
    projectSlug: "service-b",
    taskSlug: "summarize-handler"
  });

  assert.equal(summary.changedFiles, 1);
  assert.deepEqual(summary.changes, [{ path: "src/server.ts", kind: "modified" }]);
  assert.equal(typeof summary.generatedAt, "string");
  assert.equal(fs.existsSync(path.join(started.taskRoot, "summary.json")), true);
});

test("validateManagedTask writes validation artifacts before apply", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-managed-task-"));
  const validationRoot = path.join(tempRoot, "validation");
  const repo = path.join(validationRoot, "content-repo");

  fs.mkdirSync(validationRoot, { recursive: true });
  copyDir(fixtureRepo, repo);

  const started = startManagedTask(validationRoot, {
    contentRepoRoot: repo,
    projectSlug: "service-b",
    taskSlug: "validate-handler",
    mode: "workspace"
  });

  const workspaceServerPath = path.join(
    validationRoot,
    started.manifest.workspaceProjectPath,
    "src/server.ts"
  );
  fs.writeFileSync(
    workspaceServerPath,
    'export function handler() {\n  return { ok: true, name: "service-b", version: 3 };\n}\n',
    "utf8"
  );

  const validation = validateManagedTask(validationRoot, {
    contentRepoRoot: repo,
    projectSlug: "service-b",
    taskSlug: "validate-handler"
  });
  const manifest = JSON.parse(fs.readFileSync(started.manifestPath, "utf8"));
  const summary = JSON.parse(
    fs.readFileSync(path.join(started.taskRoot, "summary.json"), "utf8")
  );

  assert.equal(validation.status, "validated");
  assert.equal(validation.changedFiles, 1);
  assert.equal(typeof validation.checkedAt, "string");
  assert.equal(manifest.status, "validated");
  assert.equal(typeof manifest.lastValidatedAt, "string");
  assert.equal(summary.changedFiles, 1);
});

test("validateManagedTask rejects invalid workspace project shape", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-managed-task-"));
  const validationRoot = path.join(tempRoot, "validation");
  const repo = path.join(validationRoot, "content-repo");

  fs.mkdirSync(validationRoot, { recursive: true });
  copyDir(fixtureRepo, repo);

  const started = startManagedTask(validationRoot, {
    contentRepoRoot: repo,
    projectSlug: "landing-a",
    taskSlug: "break-route",
    mode: "workspace"
  });

  const workspaceProjectJsonPath = path.join(
    validationRoot,
    started.manifest.workspaceProjectPath,
    "project.json"
  );
  const projectJson = JSON.parse(fs.readFileSync(workspaceProjectJsonPath, "utf8"));
  projectJson.route = "/app/landing-a";
  fs.writeFileSync(workspaceProjectJsonPath, `${JSON.stringify(projectJson, null, 2)}\n`, "utf8");

  assert.throws(() => {
    validateManagedTask(validationRoot, {
      contentRepoRoot: repo,
      projectSlug: "landing-a",
      taskSlug: "break-route"
    });
  }, /static runtime route must start with \/p\//);
});
