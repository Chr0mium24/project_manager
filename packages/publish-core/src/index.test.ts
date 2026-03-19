import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  listStaticPublishRecords,
  publishStaticProject,
  readStaticPublishRecord,
  readPublishedStaticEntry
} from "./index.ts";
import {
  createTempRoot,
  writeContentRepo
} from "./test-fixtures.ts";

void test("publishStaticProject writes a static build artifact", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const result = publishStaticProject(rootDir, "landing-a");

  assert.notEqual(result, null);
  assert.equal(result.slug, "landing-a");
  assert.equal(result.runtime, "static");
  assert.equal(result.outputDir, "storage/static-builds/landing-a");
  assert.equal(result.entryPath, "index.html");
  assert.match(result.publishedAt, /\d{4}-\d{2}-\d{2}T/);
  assert.match(readPublishedStaticEntry(rootDir, "landing-a") ?? "", /Landing A/);
  assert.equal(
    fs.existsSync(path.join(rootDir, "storage", "static-builds", "landing-a", "publish.json")),
    true
  );
});

void test("publishStaticProject rejects dynamic projects", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  assert.throws(
    () => publishStaticProject(rootDir, "service-b"),
    /project is not static/
  );
});

void test("publish records can be listed and read by slug", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  assert.equal(readStaticPublishRecord(rootDir, "landing-a"), null);
  assert.deepEqual(listStaticPublishRecords(rootDir), []);

  const result = publishStaticProject(rootDir, "landing-a");
  assert.notEqual(result, null);
  assert.deepEqual(readStaticPublishRecord(rootDir, "landing-a"), result);
  assert.deepEqual(listStaticPublishRecords(rootDir), [result]);
});
