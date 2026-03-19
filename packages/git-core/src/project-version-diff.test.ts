import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  createProjectVersion,
  diffProjectVersion
} from "./index.ts";
import {
  createTempRoot,
  writeContentRepo
} from "./test-fixtures.ts";

void test("diffProjectVersion compares current project against a stored version", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);
  const version = createProjectVersion(rootDir, "landing-a", "baseline");

  assert.notEqual(version, null);
  fs.writeFileSync(
    path.join(rootDir, "content-repo", "projects", "landing-a", "src", "index.html"),
    "<!doctype html>\n<html><body><h1>Changed</h1></body></html>\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(rootDir, "content-repo", "projects", "landing-a", "src", "extra.js"),
    "console.log('extra');\n",
    "utf8"
  );

  const diff = diffProjectVersion(rootDir, "landing-a", version.versionId);

  assert.deepEqual(diff, {
    slug: "landing-a",
    versionId: version.versionId,
    baseVersionId: null,
    changedFiles: 2,
    changes: [
      { path: "src/extra.js", kind: "deleted" },
      { path: "src/index.html", kind: "modified" }
    ]
  });
});

void test("diffProjectVersion compares two stored versions", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);
  const first = createProjectVersion(rootDir, "landing-a", "first");

  assert.notEqual(first, null);
  fs.writeFileSync(
    path.join(rootDir, "content-repo", "projects", "landing-a", "src", "index.html"),
    "<!doctype html>\n<html><body><h1>Changed</h1></body></html>\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(rootDir, "content-repo", "projects", "landing-a", "src", "extra.js"),
    "console.log('extra');\n",
    "utf8"
  );
  const second = createProjectVersion(rootDir, "landing-a", "second");

  assert.notEqual(second, null);
  const diff = diffProjectVersion(rootDir, "landing-a", second.versionId, first.versionId);

  assert.deepEqual(diff, {
    slug: "landing-a",
    versionId: second.versionId,
    baseVersionId: first.versionId,
    changedFiles: 2,
    changes: [
      { path: "src/extra.js", kind: "added" },
      { path: "src/index.html", kind: "modified" }
    ]
  });
  assert.equal(diffProjectVersion(rootDir, "landing-a", "missing-version"), null);
  assert.equal(diffProjectVersion(rootDir, "landing-a", second.versionId, "missing-base"), null);
});
