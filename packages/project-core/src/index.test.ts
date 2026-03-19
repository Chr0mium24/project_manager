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

test("listProjects reads the formal content repo index", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const projects = listProjects(rootDir);

  assert.equal(projects.length, 1);
  assert.equal(projects[0]?.slug, "landing-a");
  assert.equal(projects[0]?.route, "/p/landing-a");
});

test("readProject returns a full project document", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const project = readProject(rootDir, "landing-a");

  assert.equal(project?.slug, "landing-a");
  assert.equal(project?.runtime, "static");
  assert.equal(project?.framework, "vanilla");
});

test("readProjectEntry returns null for missing projects", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  assert.equal(readProject(rootDir, "missing-project"), null);
  assert.equal(readProjectEntry(rootDir, "missing-project"), null);
});

test("readProjectEntry returns the project entry file contents", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const entryContent = readProjectEntry(rootDir, "landing-a");

  assert.match(entryContent ?? "", /Landing A/);
});

test("validateContentRepo succeeds for a valid formal content repo", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const summary = validateContentRepo(path.join(rootDir, "content-repo"));

  assert.deepEqual(summary, { projects: 1 });
});

test("validateContentRepo rejects a project that diverges from the index", () => {
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

test("createProject creates a static project in the formal content repo", () => {
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

test("createProject creates a dynamic project and force recreates the directory", () => {
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
