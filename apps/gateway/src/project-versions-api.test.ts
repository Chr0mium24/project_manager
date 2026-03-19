import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createGatewayApp } from "./index.ts";
import { writeContentRepo } from "./test-fixtures.ts";

void test("createGatewayApp creates and lists project versions", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  const createResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/versions",
    payload: {
      message: "capture current state"
    }
  });
  const listResponse = await app.inject({
    method: "GET",
    url: "/api/projects/landing-a/versions"
  });
  const createPayload: {
    version: { slug: string; message: string; versionId: string; snapshotPath: string };
  } = createResponse.json();
  const listPayload: {
    versions: Array<{ slug: string; message: string }>;
  } = listResponse.json();

  assert.equal(createResponse.statusCode, 201);
  assert.equal(createPayload.version.slug, "landing-a");
  assert.equal(createPayload.version.message, "capture current state");
  assert.match(createPayload.version.versionId, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(
    fs.readFileSync(path.join(rootDir, createPayload.version.snapshotPath, "src", "index.html"), "utf8"),
    /Landing A/
  );
  assert.equal(listResponse.statusCode, 200);
  assert.equal(listPayload.versions.length, 1);
  assert.equal(listPayload.versions[0]?.message, "capture current state");

  await app.close();
});

void test("createGatewayApp rejects invalid version payloads", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  const invalidResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/versions",
    payload: {}
  });
  const missingResponse = await app.inject({
    method: "POST",
    url: "/api/projects/missing-project/versions",
    payload: {
      message: "noop"
    }
  });

  assert.equal(invalidResponse.statusCode, 400);
  assert.equal(missingResponse.statusCode, 404);

  await app.close();
});
