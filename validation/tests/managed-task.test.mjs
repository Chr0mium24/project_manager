import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyManagedTask, startManagedTask } from "../lib/managed-task.mjs";

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

  assert.equal(applied.status, "applied");
  assert.match(targetHtml, /Updated/);
  assert.equal(manifest.status, "applied");
  assert.equal(typeof manifest.lastAppliedAt, "string");
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
