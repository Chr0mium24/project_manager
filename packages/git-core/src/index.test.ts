import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  createProjectVersion,
  listProjectVersions,
  readProjectVersion,
  restoreProjectVersion
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

void test("restoreProjectVersion restores a previous snapshot", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);
  const version = createProjectVersion(rootDir, "landing-a", "before edit");

  assert.notEqual(version, null);
  fs.writeFileSync(
    path.join(rootDir, "content-repo", "projects", "landing-a", "src", "index.html"),
    "<html><body>Changed</body></html>\n",
    "utf8"
  );

  const restored = restoreProjectVersion(rootDir, "landing-a", version.versionId);

  assert.deepEqual(restored, version);
  assert.match(
    fs.readFileSync(path.join(rootDir, "content-repo", "projects", "landing-a", "src", "index.html"), "utf8"),
    /Landing A/
  );
  assert.equal(restoreProjectVersion(rootDir, "landing-a", "missing-version"), null);
});
