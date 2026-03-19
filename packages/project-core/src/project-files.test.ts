import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  listProjectFiles,
  readProjectFile
} from "./index.ts";
import { writeProjectFile } from "./index.ts";
import { writeContentRepo } from "./test-fixtures.ts";

void test("listProjectFiles returns sorted relative file paths for a managed project", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "project-files-"));
  writeContentRepo(rootDir);

  fs.writeFileSync(
    path.join(rootDir, "content-repo", "projects", "landing-a", "src", "app.js"),
    'console.log("demo");\n',
    "utf8"
  );

  const files = listProjectFiles(rootDir, "landing-a");

  assert.deepEqual(files, [
    {
      path: "project.json",
      size: fs.statSync(path.join(rootDir, "content-repo", "projects", "landing-a", "project.json")).size
    },
    {
      path: "src/app.js",
      size: 21
    },
    {
      path: "src/index.html",
      size: fs.statSync(path.join(rootDir, "content-repo", "projects", "landing-a", "src", "index.html")).size
    }
  ]);
});

void test("readProjectFile returns file content and rejects unsafe paths", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "project-files-"));
  writeContentRepo(rootDir);

  assert.match(readProjectFile(rootDir, "landing-a", "src/index.html") ?? "", /Landing A/);
  assert.equal(readProjectFile(rootDir, "landing-a", "src/missing.js"), null);
  assert.equal(readProjectFile(rootDir, "missing-project", "src/index.html"), null);
  assert.throws(
    () => readProjectFile(rootDir, "landing-a", "../outside.txt"),
    /unsafe project file path/
  );
});

void test("writeProjectFile writes content and updates project metadata", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "project-files-"));
  writeContentRepo(rootDir);

  const beforeProjectJson = fs.readFileSync(
    path.join(rootDir, "content-repo", "projects", "landing-a", "project.json"),
    "utf8"
  );

  const result = writeProjectFile(rootDir, "landing-a", "src/app.js", 'console.log("saved");\n');

  assert.equal(readProjectFile(rootDir, "landing-a", "src/app.js"), 'console.log("saved");\n');
  assert.equal(result.path, "src/app.js");
  assert.equal(result.size, Buffer.byteLength('console.log("saved");\n', "utf8"));
  assert.notEqual(
    fs.readFileSync(path.join(rootDir, "content-repo", "projects", "landing-a", "project.json"), "utf8"),
    beforeProjectJson
  );
});
