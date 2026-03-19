import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createGatewayApp } from "./index.ts";
import {
  TEST_ADMIN_TOKEN,
  authHeaders,
  writeContentRepo
} from "./test-fixtures.ts";

void test("createGatewayApp creates and lists project versions", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir, { adminToken: TEST_ADMIN_TOKEN });

  const createResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/versions",
    headers: authHeaders(),
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

void test("createGatewayApp reads a single project version", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir, { adminToken: TEST_ADMIN_TOKEN });

  const createResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/versions",
    headers: authHeaders(),
    payload: {
      message: "snapshot for read"
    }
  });
  const createPayload: { version: { versionId: string } } = createResponse.json();
  const readResponse = await app.inject({
    method: "GET",
    url: `/api/projects/landing-a/versions/${createPayload.version.versionId}`
  });
  const readPayload: {
    version: { slug: string; versionId: string; message: string };
  } = readResponse.json();

  assert.equal(readResponse.statusCode, 200);
  assert.equal(readPayload.version.slug, "landing-a");
  assert.equal(readPayload.version.versionId, createPayload.version.versionId);
  assert.equal(readPayload.version.message, "snapshot for read");

  const missingResponse = await app.inject({
    method: "GET",
    url: "/api/projects/landing-a/versions/missing-version"
  });
  assert.equal(missingResponse.statusCode, 404);

  await app.close();
});

void test("createGatewayApp rejects invalid version payloads", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir, { adminToken: TEST_ADMIN_TOKEN });

  const invalidResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/versions",
    headers: authHeaders(),
    payload: {}
  });
  const missingResponse = await app.inject({
    method: "POST",
    url: "/api/projects/missing-project/versions",
    headers: authHeaders(),
    payload: {
      message: "noop"
    }
  });

  assert.equal(invalidResponse.statusCode, 400);
  assert.equal(missingResponse.statusCode, 404);

  await app.close();
});

void test("createGatewayApp restores a previous project version", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir, { adminToken: TEST_ADMIN_TOKEN });

  const createResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/versions",
    headers: authHeaders(),
    payload: {
      message: "restore target"
    }
  });
  const createPayload: { version: { versionId: string } } = createResponse.json();
  fs.writeFileSync(
    path.join(rootDir, "content-repo", "projects", "landing-a", "src", "index.html"),
    "<html><body>Changed</body></html>\n",
    "utf8"
  );

  const restoreResponse = await app.inject({
    method: "POST",
    url: `/api/projects/landing-a/versions/${createPayload.version.versionId}/restore`,
    headers: authHeaders()
  });
  const restorePayload: {
    restoredVersion: { versionId: string };
  } = restoreResponse.json();

  assert.equal(restoreResponse.statusCode, 200);
  assert.equal(restorePayload.restoredVersion.versionId, createPayload.version.versionId);
  assert.match(
    fs.readFileSync(path.join(rootDir, "content-repo", "projects", "landing-a", "src", "index.html"), "utf8"),
    /Landing A/
  );

  const missingResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/versions/missing-version/restore",
    headers: authHeaders()
  });
  assert.equal(missingResponse.statusCode, 404);

  await app.close();
});

void test("createGatewayApp reads a version diff against the current project", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir, { adminToken: TEST_ADMIN_TOKEN });

  const createResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/versions",
    headers: authHeaders(),
    payload: {
      message: "baseline"
    }
  });
  const createPayload: { version: { versionId: string } } = createResponse.json();
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

  const diffResponse = await app.inject({
    method: "GET",
    url: `/api/projects/landing-a/versions/${createPayload.version.versionId}/diff`
  });
  const diffPayload: {
    diff: {
      changedFiles: number;
      baseVersionId: string | null;
      changes: Array<{ path: string; kind: string }>;
    };
  } = diffResponse.json();

  assert.equal(diffResponse.statusCode, 200);
  assert.equal(diffPayload.diff.baseVersionId, null);
  assert.equal(diffPayload.diff.changedFiles, 2);
  assert.deepEqual(diffPayload.diff.changes, [
    { path: "src/extra.js", kind: "deleted" },
    { path: "src/index.html", kind: "modified" }
  ]);

  await app.close();
});

void test("createGatewayApp reads a version diff against another version", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir, { adminToken: TEST_ADMIN_TOKEN });

  const firstResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/versions",
    headers: authHeaders(),
    payload: {
      message: "first"
    }
  });
  const firstPayload: { version: { versionId: string } } = firstResponse.json();
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
  const secondResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/versions",
    headers: authHeaders(),
    payload: {
      message: "second"
    }
  });
  const secondPayload: { version: { versionId: string } } = secondResponse.json();

  const diffResponse = await app.inject({
    method: "GET",
    url: `/api/projects/landing-a/versions/${secondPayload.version.versionId}/diff?baseVersionId=${firstPayload.version.versionId}`
  });
  const diffPayload: {
    diff: {
      changedFiles: number;
      baseVersionId: string | null;
      changes: Array<{ path: string; kind: string }>;
    };
  } = diffResponse.json();
  const missingDiff = await app.inject({
    method: "GET",
    url: `/api/projects/landing-a/versions/${secondPayload.version.versionId}/diff?baseVersionId=missing-base`
  });

  assert.equal(diffResponse.statusCode, 200);
  assert.equal(diffPayload.diff.baseVersionId, firstPayload.version.versionId);
  assert.equal(diffPayload.diff.changedFiles, 2);
  assert.deepEqual(diffPayload.diff.changes, [
    { path: "src/extra.js", kind: "added" },
    { path: "src/index.html", kind: "modified" }
  ]);
  assert.equal(missingDiff.statusCode, 404);

  await app.close();
});
