import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createProject,
  getProjectsIndexPath,
  listProjects,
  readProject,
  readProjectEntry,
  startManagedTask,
  validateContentRepo
} from "./index.ts";

function createTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "project-core-"));
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeContentRepo(rootDir: string): void {
  const contentRepoRoot = path.join(rootDir, "content-repo");
  fs.mkdirSync(path.join(contentRepoRoot, "projects", "landing-a", "src"), { recursive: true });

  writeJson(getProjectsIndexPath(rootDir), {
    version: 1,
    generatedAt: "2026-03-20T00:00:00.000Z",
    projects: [
      {
        slug: "landing-a",
        path: "projects/landing-a",
        name: "Landing A",
        runtime: "static",
        visibility: "private",
        entry: "src/index.html",
        route: "/p/landing-a",
        updatedAt: "2026-03-20T00:00:00.000Z"
      }
    ]
  });

  writeJson(path.join(contentRepoRoot, "projects", "landing-a", "project.json"), {
    schemaVersion: 1,
    name: "Landing A",
    slug: "landing-a",
    description: "Official sample static project",
    runtime: "static",
    entry: "src/index.html",
    route: "/p/landing-a",
    visibility: "private",
    tags: ["landing", "sample"],
    latestVersion: "v1",
    mainLanguage: "html",
    framework: "vanilla",
    owner: "project-manager",
    createdAt: "2026-03-20T00:00:00.000Z",
    updatedAt: "2026-03-20T00:00:00.000Z"
  });
  fs.writeFileSync(
    path.join(contentRepoRoot, "projects", "landing-a", "src", "index.html"),
    "<!doctype html>\n<html><body><h1>Landing A</h1></body></html>\n",
    "utf8"
  );
}

void test("listProjects reads the formal content repo index", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const projects = listProjects(rootDir);

  assert.equal(projects.length, 1);
  assert.equal(projects[0].slug, "landing-a");
  assert.equal(projects[0].route, "/p/landing-a");
});

void test("readProject returns a full project document", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const project = readProject(rootDir, "landing-a");

  assert.notEqual(project, null);
  assert.equal(project.slug, "landing-a");
  assert.equal(project.runtime, "static");
  assert.equal(project.framework, "vanilla");
});

void test("readProjectEntry returns null for missing projects", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  assert.equal(readProject(rootDir, "missing-project"), null);
  assert.equal(readProjectEntry(rootDir, "missing-project"), null);
});

void test("readProjectEntry returns the project entry file contents", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const entryContent = readProjectEntry(rootDir, "landing-a");

  assert.match(entryContent ?? "", /Landing A/);
});

void test("validateContentRepo succeeds for a valid formal content repo", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const summary = validateContentRepo(path.join(rootDir, "content-repo"));

  assert.deepEqual(summary, { projects: 1 });
});

void test("validateContentRepo rejects a project that diverges from the index", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);
  writeJson(path.join(rootDir, "content-repo", "projects", "landing-a", "project.json"), {
    schemaVersion: 1,
    name: "Landing A",
    slug: "landing-a",
    description: "Official sample static project",
    runtime: "static",
    entry: "src/index.html",
    route: "/p/landing-a-v2",
    visibility: "private",
    tags: ["landing", "sample"],
    latestVersion: "v1",
    mainLanguage: "html",
    framework: "vanilla",
    owner: "project-manager",
    createdAt: "2026-03-20T00:00:00.000Z",
    updatedAt: "2026-03-20T00:00:00.000Z"
  });

  assert.throws(
    () => validateContentRepo(path.join(rootDir, "content-repo")),
    /static project route must equal \/p<slug>|static project route must equal \/p\/<slug>|index route does not match project\.json/
  );
});

void test("createProject creates a static project in the formal content repo", () => {
  const rootDir = createTempRoot();
  fs.mkdirSync(path.join(rootDir, "content-repo", "projects"), { recursive: true });
  writeJson(getProjectsIndexPath(rootDir), {
    version: 1,
    generatedAt: "2026-03-20T00:00:00.000Z",
    projects: []
  });

  const project = createProject(rootDir, {
    slug: "demo-static",
    name: "Demo Static",
    runtime: "static"
  });

  assert.equal(project.slug, "demo-static");
  assert.equal(project.route, "/p/demo-static");
  assert.match(readProjectEntry(rootDir, "demo-static") ?? "", /Demo Static/);
  assert.deepEqual(listProjects(rootDir).map((item) => item.slug), ["demo-static"]);
  assert.deepEqual(validateContentRepo(path.join(rootDir, "content-repo")), { projects: 1 });
});

void test("createProject creates a dynamic project and force recreates the directory", () => {
  const rootDir = createTempRoot();
  fs.mkdirSync(path.join(rootDir, "content-repo", "projects"), { recursive: true });
  writeJson(getProjectsIndexPath(rootDir), {
    version: 1,
    generatedAt: "2026-03-20T00:00:00.000Z",
    projects: []
  });

  createProject(rootDir, {
    slug: "demo-service",
    name: "Demo Service",
    runtime: "dynamic"
  });
  fs.writeFileSync(
    path.join(rootDir, "content-repo", "projects", "demo-service", "stale.txt"),
    "stale\n",
    "utf8"
  );

  const recreatedProject = createProject(rootDir, {
    slug: "demo-service",
    name: "Demo Service",
    runtime: "dynamic",
    force: true
  });

  assert.equal(recreatedProject.route, "/app/demo-service");
  assert.equal(
    fs.existsSync(path.join(rootDir, "content-repo", "projects", "demo-service", "stale.txt")),
    false
  );
  assert.match(readProjectEntry(rootDir, "demo-service") ?? "", /demo-service/);
  assert.deepEqual(validateContentRepo(path.join(rootDir, "content-repo")), { projects: 1 });
});

void test("startManagedTask creates an isolated formal workspace and manifest", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const result = startManagedTask(rootDir, {
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
    fs.existsSync(path.join(rootDir, result.manifest.workspaceProjectPath, "project.json")),
    true
  );
});

void test("startManagedTask produces branch metadata for git-branch mode", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);
  createProject(rootDir, {
    slug: "service-b",
    name: "Service B",
    runtime: "dynamic"
  });

  const result = startManagedTask(rootDir, {
    projectSlug: "service-b",
    taskSlug: "fix-handler",
    mode: "git-branch"
  });

  assert.equal(result.manifest.branchName, "task/service-b--fix-handler");
  assert.equal(result.manifest.prPolicy, "forbidden");
});

void test("startManagedTask rejects unknown managed projects", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  assert.throws(
    () =>
      startManagedTask(rootDir, {
        projectSlug: "missing-project",
        taskSlug: "fix-copy",
        mode: "workspace"
      }),
    /managed project not found/
  );
});

void test("startManagedTask with force recreates a clean task directory", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const started = startManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "redo-copy",
    mode: "workspace"
  });

  fs.writeFileSync(path.join(started.taskRoot, "summary.json"), "{\"stale\":true}\n", "utf8");
  fs.writeFileSync(path.join(started.taskRoot, "validation.json"), "{\"stale\":true}\n", "utf8");

  const restarted = startManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "redo-copy",
    mode: "workspace",
    force: true
  });

  assert.equal(fs.existsSync(path.join(restarted.taskRoot, "summary.json")), false);
  assert.equal(fs.existsSync(path.join(restarted.taskRoot, "validation.json")), false);
  assert.equal(fs.existsSync(restarted.manifestPath), true);
});
