import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { type FastifyInstance } from "fastify";
import { createGatewayApp } from "./index.ts";
import { TEST_ADMIN_TOKEN, authHeaders, writeContentRepo } from "./test-fixtures.ts";

interface AiTaskResponsePayload {
  task: { taskId: string; status: string; summaryPath?: string | null; appliedAt?: string | null };
}

async function waitForCompletedTask(app: FastifyInstance, taskId: string): Promise<AiTaskResponsePayload> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await app.inject({
      method: "GET",
      url: `/api/ai/tasks/${taskId}`
    });
    const payload: AiTaskResponsePayload = response.json();
    if (payload.task.status === "completed") {
      return payload;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  throw new Error(`ai task did not complete: ${taskId}`);
}

function createSecuredApp(rootDir: string) {
  return createGatewayApp(rootDir, {
    adminToken: TEST_ADMIN_TOKEN,
    aiExecutor: ({ cwd }) => {
      fs.writeFileSync(
        path.join(cwd, "src", "index.html"),
        "<!doctype html>\n<html><body><h1>Codex Updated</h1></body></html>\n",
        "utf8"
      );
      return {
        exitCode: 0,
        stdout: "{\"status\":\"ok\"}\n",
        stderr: "",
        error: null
      };
    }
  });
}

void test("createGatewayApp creates and reads an ai task", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createSecuredApp(rootDir);

  const createResponse = await app.inject({
    method: "POST",
    url: "/api/ai/tasks",
    headers: authHeaders(),
    payload: {
      projectSlug: "landing-a",
      taskSlug: "fix-copy",
      prompt: "Update the heading."
    }
  });
  const createPayload: {
    task: { taskId: string; status: string; summaryPath: string | null };
  } = createResponse.json();
  const listResponse = await app.inject({
    method: "GET",
    url: "/api/ai/tasks"
  });
  const readResponse = await app.inject({
    method: "GET",
    url: `/api/ai/tasks/${createPayload.task.taskId}`
  });
  const completedPayload = await waitForCompletedTask(app, createPayload.task.taskId);
  const summaryResponse = await app.inject({
    method: "GET",
    url: `/api/ai/tasks/${createPayload.task.taskId}/summary`
  });
  const listPayload: {
    tasks: Array<{ taskId: string }>;
  } = listResponse.json();
  const summaryPayload: {
    summary: { changedFiles: number };
  } = summaryResponse.json();

  assert.equal(createResponse.statusCode, 202);
  assert.equal(createPayload.task.status, "queued");
  assert.equal(listResponse.statusCode, 200);
  assert.equal(listPayload.tasks.length, 1);
  assert.equal(readResponse.statusCode, 200);
  assert.equal(completedPayload.task.status, "completed");
  assert.equal(summaryResponse.statusCode, 200);
  assert.equal(summaryPayload.summary.changedFiles, 1);

  await app.close();
});

void test("createGatewayApp validates ai task create body and missing task reads", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createSecuredApp(rootDir);

  const invalidCreate = await app.inject({
    method: "POST",
    url: "/api/ai/tasks",
    headers: authHeaders(),
    payload: {
      projectSlug: "landing-a"
    }
  });
  const missingRead = await app.inject({
    method: "GET",
    url: "/api/ai/tasks/missing-task"
  });

  assert.equal(invalidCreate.statusCode, 400);
  assert.equal(missingRead.statusCode, 404);

  await app.close();
});

void test("createGatewayApp applies a completed ai task back to the managed project", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createSecuredApp(rootDir);

  const createResponse = await app.inject({
    method: "POST",
    url: "/api/ai/tasks",
    headers: authHeaders(),
    payload: {
      projectSlug: "landing-a",
      taskSlug: "apply-copy",
      prompt: "Update the heading."
    }
  });
  const createPayload: {
    task: { taskId: string };
  } = createResponse.json();
  const applyResponse = await app.inject({
    method: "POST",
    url: `/api/ai/tasks/${createPayload.task.taskId}/apply`,
    headers: authHeaders()
  });
  if (applyResponse.statusCode === 409) {
    await waitForCompletedTask(app, createPayload.task.taskId);
  }
  const retryApply = await app.inject({
    method: "POST",
    url: `/api/ai/tasks/${createPayload.task.taskId}/apply`,
    headers: authHeaders()
  });
  const applyPayload: {
    task: { appliedAt: string | null };
  } = retryApply.json();
  const readResponse = await app.inject({
    method: "GET",
    url: `/api/ai/tasks/${createPayload.task.taskId}`
  });
  const readPayload: AiTaskResponsePayload = readResponse.json();
  const projectSource = fs.readFileSync(
    path.join(rootDir, "content-repo", "projects", "landing-a", "src", "index.html"),
    "utf8"
  );

  assert.equal(retryApply.statusCode, 200);
  assert.notEqual(applyPayload.task.appliedAt, null);
  assert.equal(readResponse.statusCode, 200);
  assert.notEqual(readPayload.task.appliedAt ?? null, null);
  assert.match(projectSource, /Codex Updated/);

  await app.close();
});
