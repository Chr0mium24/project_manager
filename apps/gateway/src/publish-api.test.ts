import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createGatewayApp } from "./index.ts";
import { writeContentRepo } from "./test-fixtures.ts";

interface StaticPublishPayload {
  result: {
    slug: string;
    runtime: "static";
    outputDir: string;
    entryPath: string;
    publishedAt: string;
  };
}

void test("createGatewayApp publishes a static project", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  const publishResponse = await app.inject({
    method: "POST",
    url: "/api/publish/static/landing-a"
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
  const app = createGatewayApp(rootDir);

  const response = await app.inject({
    method: "POST",
    url: "/api/publish/static/service-b"
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), {
    error: "invalid-static-publish-target",
    slug: "service-b",
    message: "project is not static: service-b"
  });

  await app.close();
});
