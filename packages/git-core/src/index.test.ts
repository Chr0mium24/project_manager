import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  createProjectVersion,
  listProjectVersions,
  readProjectVersion
} from "./index.ts";
import {
  createTempRoot,
  writeContentRepo
} from "./test-fixtures.ts";

void test("createProjectVersion snapshots a managed project", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const result = createProjectVersion(rootDir, "landing-a", "initial snapshot");

  assert.notEqual(result, null);
  assert.equal(result.slug, "landing-a");
  assert.equal(result.message, "initial snapshot");
  assert.match(result.versionId, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(
    fs.readFileSync(path.join(rootDir, result.snapshotPath, "src", "index.html"), "utf8"),
    /Landing A/
  );
});

void test("version records can be listed and read", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const first = createProjectVersion(rootDir, "landing-a", "first");
  const second = createProjectVersion(rootDir, "landing-a", "second");

  assert.notEqual(first, null);
  assert.notEqual(second, null);
  assert.deepEqual(readProjectVersion(rootDir, "landing-a", first.versionId), first);
  assert.equal(listProjectVersions(rootDir, "landing-a").length, 2);
});

void test("createProjectVersion returns null for missing projects", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  assert.equal(createProjectVersion(rootDir, "missing-project", "noop"), null);
  assert.deepEqual(listProjectVersions(rootDir, "missing-project"), []);
});
