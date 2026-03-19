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

interface StaticPublishPayload {
  result: {
    slug: string;
    runtime: "static";
    outputDir: string;
    entryPath: string;
    publishedAt: string;
  };
}

interface DynamicPublishPayload {
  result: {
    slug: string;
    runtime: "dynamic";
    outputDir: string;
    entryPath: string;
    route: string;
    publishedAt: string;
  };
}

void test("createGatewayApp publishes a static project", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir, { adminToken: TEST_ADMIN_TOKEN });

  const publishResponse = await app.inject({
    method: "POST",
    url: "/api/publish/static/landing-a",
    headers: authHeaders()
  });
  const publishPayload: StaticPublishPayload = publishResponse.json();

  assert.equal(publishResponse.statusCode, 200);
  assert.deepEqual(publishPayload, {
    result: {
      slug: "landing-a",
      runtime: "static",
      outputDir: "storage/static-builds/landing-a",
      entryPath: "index.html",
      publishedAt: publishPayload.result.publishedAt
    }
  });
  assert.match(
    fs.readFileSync(path.join(rootDir, "storage", "static-builds", "landing-a", "index.html"), "utf8"),
    /Landing A/
  );

  await app.close();
});

void test("createGatewayApp rejects publishing a dynamic project as static", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir, { adminToken: TEST_ADMIN_TOKEN });

  const response = await app.inject({
    method: "POST",
    url: "/api/publish/static/service-b",
    headers: authHeaders()
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), {
    error: "invalid-static-publish-target",
    slug: "service-b",
    message: "project is not static: service-b"
  });

  await app.close();
});

void test("createGatewayApp lists and reads static publish records", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir, { adminToken: TEST_ADMIN_TOKEN });

  const emptyListResponse = await app.inject({
    method: "GET",
    url: "/api/publish/static"
  });
  const missingRecordResponse = await app.inject({
    method: "GET",
    url: "/api/publish/static/landing-a"
  });

  assert.equal(emptyListResponse.statusCode, 200);
  assert.deepEqual(emptyListResponse.json(), { results: [] });
  assert.equal(missingRecordResponse.statusCode, 404);
  assert.deepEqual(missingRecordResponse.json(), {
    error: "static-publish-not-found",
    slug: "landing-a"
  });

  await app.inject({
    method: "POST",
    url: "/api/publish/static/landing-a",
    headers: authHeaders()
  });

  const listResponse = await app.inject({
    method: "GET",
    url: "/api/publish/static"
  });
  const readResponse = await app.inject({
    method: "GET",
    url: "/api/publish/static/landing-a"
  });
  const listPayload: {
    results: Array<{ slug: string; runtime: string; outputDir: string; entryPath: string }>;
  } = listResponse.json();
  const readPayload: {
    result: { slug: string; runtime: string; outputDir: string; entryPath: string };
  } = readResponse.json();

  assert.equal(listResponse.statusCode, 200);
  assert.equal(listPayload.results.length, 1);
  assert.equal(listPayload.results[0]?.slug, "landing-a");
  assert.equal(readResponse.statusCode, 200);
  assert.equal(readPayload.result.slug, "landing-a");

  await app.close();
});

void test("createGatewayApp publishes a dynamic project", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir, { adminToken: TEST_ADMIN_TOKEN });

  const publishResponse = await app.inject({
    method: "POST",
    url: "/api/publish/dynamic/service-b",
    headers: authHeaders()
  });
  const publishPayload: DynamicPublishPayload = publishResponse.json();

  assert.equal(publishResponse.statusCode, 200);
  assert.deepEqual(publishPayload, {
    result: {
      slug: "service-b",
      runtime: "dynamic",
      outputDir: "storage/dynamic-builds/service-b",
      entryPath: "project/src/server.ts",
      route: "/app/service-b",
      publishedAt: publishPayload.result.publishedAt
    }
  });
  assert.match(
    fs.readFileSync(path.join(rootDir, "storage", "dynamic-builds", "service-b", "project", "src", "server.ts"), "utf8"),
    /service-b/
  );

  await app.close();
});

void test("createGatewayApp lists and reads dynamic publish records", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir, { adminToken: TEST_ADMIN_TOKEN });

  const emptyListResponse = await app.inject({
    method: "GET",
    url: "/api/publish/dynamic"
  });
  const missingRecordResponse = await app.inject({
    method: "GET",
    url: "/api/publish/dynamic/service-b"
  });

  assert.equal(emptyListResponse.statusCode, 200);
  assert.deepEqual(emptyListResponse.json(), { results: [] });
  assert.equal(missingRecordResponse.statusCode, 404);
  assert.deepEqual(missingRecordResponse.json(), {
    error: "dynamic-publish-not-found",
    slug: "service-b"
  });

  await app.close();
});

void test("createGatewayApp reads dynamic publish records after publish", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir, { adminToken: TEST_ADMIN_TOKEN });

  await app.inject({
    method: "POST",
    url: "/api/publish/dynamic/service-b",
    headers: authHeaders()
  });

  const listResponse = await app.inject({
    method: "GET",
    url: "/api/publish/dynamic"
  });
  const readResponse = await app.inject({
    method: "GET",
    url: "/api/publish/dynamic/service-b"
  });
  const listPayload: {
    results: Array<{ slug: string; runtime: string; outputDir: string; route: string }>;
  } = listResponse.json();
  const readPayload: {
    result: { slug: string; runtime: string; outputDir: string; route: string };
  } = readResponse.json();

  assert.equal(listResponse.statusCode, 200);
  assert.equal(listPayload.results.length, 1);
  assert.equal(listPayload.results[0]?.slug, "service-b");
  assert.equal(readResponse.statusCode, 200);
  assert.equal(readPayload.result.slug, "service-b");
  assert.equal(readPayload.result.route, "/app/service-b");

  await app.close();
});

void test("createGatewayApp rejects publishing a static project as dynamic", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir, { adminToken: TEST_ADMIN_TOKEN });

  const invalidResponse = await app.inject({
    method: "POST",
    url: "/api/publish/dynamic/landing-a",
    headers: authHeaders()
  });
  assert.equal(invalidResponse.statusCode, 400);
  assert.deepEqual(invalidResponse.json(), {
    error: "invalid-dynamic-publish-target",
    slug: "landing-a",
    message: "project is not dynamic: landing-a"
  });

  await app.close();
});
