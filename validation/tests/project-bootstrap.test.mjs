import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createProject } from "../lib/project-bootstrap.mjs";
import { validateContentRepo } from "../lib/validators.mjs";

function copyDir(source, target) {
  fs.cpSync(source, target, { recursive: true });
}

test("createProject creates a static project and updates index", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-validation-"));
  const sourceRepo = path.resolve("content-repo");
  const repo = path.join(tempRoot, "content-repo");
  copyDir(sourceRepo, repo);

  const result = createProject(repo, {
    slug: "demo-static",
    name: "Demo Static",
    runtime: "static"
  });

  assert.equal(result.route, "/p/demo-static");
  assert.equal(result.entry, "src/index.html");
  assert.equal(fs.existsSync(path.join(repo, "projects/demo-static/project.json")), true);
  assert.equal(fs.existsSync(path.join(repo, "projects/demo-static/src/index.html")), true);

  const validation = validateContentRepo(repo);
  assert.equal(validation.projects, 3);
});

test("createProject creates a dynamic project and updates index", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-validation-"));
  const sourceRepo = path.resolve("content-repo");
  const repo = path.join(tempRoot, "content-repo");
  copyDir(sourceRepo, repo);

  const result = createProject(repo, {
    slug: "demo-service",
    name: "Demo Service",
    runtime: "dynamic",
    visibility: "unlisted"
  });

  assert.equal(result.route, "/app/demo-service");
  assert.equal(result.entry, "src/server.ts");
  assert.equal(fs.existsSync(path.join(repo, "projects/demo-service/project.json")), true);
  assert.equal(fs.existsSync(path.join(repo, "projects/demo-service/src/server.ts")), true);

  const validation = validateContentRepo(repo);
  assert.equal(validation.projects, 3);
});
