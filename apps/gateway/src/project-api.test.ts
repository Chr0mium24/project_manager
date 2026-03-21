import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createGatewayApp } from "./index.ts";
import { TEST_ADMIN_TOKEN, authHeaders, writeContentRepo } from "./test-fixtures.ts";

function successfulAiExecutor() {
  return Promise.resolve({
    exitCode: 0,
    stdout: "",
    stderr: "",
    error: null,
    sessionId: null
  });
}

function passingMutationChecks() {
  return Promise.resolve({
    command: "./scripts/run-quality-gate.sh",
    durationMs: 12,
    exitCode: 0,
    ok: true,
    stdout: "ok",
    stderr: ""
  });
}

function createSecuredApp(rootDir: string) {
  return createGatewayApp(rootDir, { adminToken: TEST_ADMIN_TOKEN });
}

function assertProjectCleanup(rootDir: string): void {
  assert.equal(fs.existsSync(path.join(rootDir, "storage", "managed-tasks", "landing-a")), false);
  assert.equal(fs.existsSync(path.join(rootDir, "storage", "project-versions", "landing-a")), false);
  assert.equal(fs.existsSync(path.join(rootDir, "storage", "static-builds", "landing-a")), false);
}

void test("createGatewayApp deletes a managed project", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, "storage", "managed-tasks", "landing-a"), { recursive: true });
  fs.mkdirSync(path.join(rootDir, "storage", "project-versions", "landing-a"), { recursive: true });
  fs.mkdirSync(path.join(rootDir, "storage", "static-builds", "landing-a"), { recursive: true });
  const app = createSecuredApp(rootDir);

  const deleteResponse = await app.inject({
    method: "DELETE",
    url: "/api/projects/landing-a",
    headers: authHeaders()
  });
  const deletedPayload: {
    project: { slug: string };
  } = deleteResponse.json();
  const getDeletedResponse = await app.inject({
    method: "GET",
    url: "/api/projects/landing-a"
  });
  const listResponse = await app.inject({
    method: "GET",
    url: "/api/projects"
  });
  const missingDeleteResponse = await app.inject({
    method: "DELETE",
    url: "/api/projects/missing-project",
    headers: authHeaders()
  });
  const listPayload: {
    projects: Array<{ slug: string }>;
  } = listResponse.json();

  assert.equal(deleteResponse.statusCode, 200);
  assert.equal(deletedPayload.project.slug, "landing-a");
  assert.equal(getDeletedResponse.statusCode, 404);
  assert.deepEqual(listPayload.projects.map((item) => item.slug), ["service-b"]);
  assert.equal(missingDeleteResponse.statusCode, 404);
  assertProjectCleanup(rootDir);

  await app.close();
});

void test("createGatewayApp creates a project, queues ai bootstrap, and returns checks", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir, {
    adminToken: TEST_ADMIN_TOKEN,
    aiExecutor: successfulAiExecutor,
    mutationChecksRunner: passingMutationChecks
  });

  const createResponse = await app.inject({
    method: "POST",
    url: "/api/projects",
    headers: authHeaders(),
    payload: {
      slug: "new-docs",
      name: "New Docs",
      runtime: "static",
      visibility: "public",
      description: "Generated via gateway api",
      aiPrompt: "Create a docs landing page",
      runChecks: true
    }
  });
  const payload: {
    project: { slug: string; path: string };
    task: { taskId: string; projectSlug: string; taskSlug: string } | null;
    checks: { ok: boolean; stdout: string } | null;
  } = createResponse.json();
  const readResponse = await app.inject({
    method: "GET",
    url: "/api/projects/new-docs"
  });

  assert.equal(createResponse.statusCode, 201);
  assert.equal(payload.project.slug, "new-docs");
  assert.equal(payload.project.path, "projects/new-docs");
  assert.notEqual(payload.task, null);
  assert.notEqual(payload.checks, null);
  assert.equal(payload.task.projectSlug, "new-docs");
  assert.equal(payload.task.taskSlug, "init");
  assert.equal(payload.checks.ok, true);
  assert.equal(payload.checks.stdout, "ok");
  assert.equal(readResponse.statusCode, 200);

  await app.close();
});
