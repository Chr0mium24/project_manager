import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createGatewayApp } from "./index.ts";
import { writeContentRepo } from "./test-fixtures.ts";

interface ManagedTaskResponse {
  task: {
    projectSlug: string;
    taskSlug: string;
    mode: "workspace" | "git-branch";
    commitPolicy: "final-result-only";
    prPolicy: "forbidden";
    branchName: string | null;
  };
}

void test("createGatewayApp starts a managed task workspace", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  const response = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/tasks",
    payload: {
      taskSlug: "fix-copy"
    }
  });
  const payload: ManagedTaskResponse = response.json();

  assert.equal(response.statusCode, 201);
  assert.equal(payload.task.projectSlug, "landing-a");
  assert.equal(payload.task.taskSlug, "fix-copy");
  assert.equal(payload.task.mode, "workspace");
  assert.equal(payload.task.commitPolicy, "final-result-only");
  assert.equal(payload.task.prPolicy, "forbidden");
  assert.equal(payload.task.branchName, null);

  await app.close();
});

void test("createGatewayApp rejects duplicate managed tasks without force", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  const firstResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/tasks",
    payload: {
      taskSlug: "fix-copy"
    }
  });
  const secondResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/tasks",
    payload: {
      taskSlug: "fix-copy"
    }
  });

  assert.equal(firstResponse.statusCode, 201);
  assert.equal(secondResponse.statusCode, 409);

  await app.close();
});
