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

void test("createGatewayApp keeps read routes open and protects control mutations", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);

  const openApp = createGatewayApp(rootDir, { adminToken: TEST_ADMIN_TOKEN });
  const readResponse = await openApp.inject({
    method: "GET",
    url: "/api/projects"
  });
  const writeResponse = await openApp.inject({
    method: "POST",
    url: "/api/projects/landing-a/tasks",
    payload: {
      taskSlug: "blocked-task"
    }
  });
  const allowedWrite = await openApp.inject({
    method: "POST",
    url: "/api/projects/landing-a/tasks",
    headers: authHeaders(),
    payload: {
      taskSlug: "allowed-task"
    }
  });

  assert.equal(readResponse.statusCode, 200);
  assert.equal(writeResponse.statusCode, 401);
  assert.equal(writeResponse.headers["www-authenticate"], 'Bearer realm="project-manager"');
  assert.equal(allowedWrite.statusCode, 201);
  await openApp.close();
});

void test("createGatewayApp rejects protected writes when auth is not configured", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  const response = await app.inject({
    method: "POST",
    url: "/api/publish/static/landing-a",
    payload: {}
  });

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), {
    error: "auth-not-configured"
  });
  await app.close();
});
