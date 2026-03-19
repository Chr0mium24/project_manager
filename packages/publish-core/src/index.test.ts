import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  listDynamicPublishRecords,
  listStaticPublishRecords,
  publishDynamicProject,
  publishStaticProject,
  readDynamicPublishRecord,
  readPublishedDynamicTarget,
  readPublishedStaticEntry,
  readStaticPublishRecord
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

void test("publishDynamicProject writes a dynamic build artifact", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const result = publishDynamicProject(rootDir, "service-b");

  assert.notEqual(result, null);
  assert.equal(result.slug, "service-b");
  assert.equal(result.runtime, "dynamic");
  assert.equal(result.route, "/app/service-b");
  assert.equal(result.outputDir, "storage/dynamic-builds/service-b");
  assert.match(result.entryPath, /project\/src\/server\.ts$/);
  assert.match(
    fs.readFileSync(path.join(rootDir, "storage", "dynamic-builds", "service-b", "project", "src", "server.ts"), "utf8"),
    /handler/
  );
});

void test("dynamic publish records can be listed and read by slug", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  assert.equal(readDynamicPublishRecord(rootDir, "service-b"), null);
  assert.deepEqual(listDynamicPublishRecords(rootDir), []);

  const result = publishDynamicProject(rootDir, "service-b");

  assert.notEqual(result, null);
  assert.deepEqual(readDynamicPublishRecord(rootDir, "service-b"), result);
  assert.deepEqual(listDynamicPublishRecords(rootDir), [result]);
  assert.throws(() => publishDynamicProject(rootDir, "landing-a"), /project is not dynamic/);
});

void test("readPublishedDynamicTarget resolves a published dynamic entry", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  assert.equal(readPublishedDynamicTarget(rootDir, "service-b"), null);

  const result = publishDynamicProject(rootDir, "service-b");
  assert.notEqual(result, null);
  assert.deepEqual(readPublishedDynamicTarget(rootDir, "service-b"), {
    slug: "service-b",
    route: "/app/service-b",
    entryPath: path.join(rootDir, "storage", "dynamic-builds", "service-b", "project", "src", "server.ts")
  });
});
