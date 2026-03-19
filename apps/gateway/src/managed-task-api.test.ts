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

void test("createGatewayApp lists managed tasks", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  const emptyListResponse = await app.inject({
    method: "GET",
    url: "/api/projects/landing-a/tasks"
  });

  await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/tasks",
    payload: {
      taskSlug: "first-task"
    }
  });
  const started = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/tasks",
    payload: {
      taskSlug: "second-task",
      mode: "git-branch"
    }
  });
  const listResponse = await app.inject({
    method: "GET",
    url: "/api/projects/landing-a/tasks"
  });
  const listPayload: { tasks: Array<{ taskSlug: string }> } = listResponse.json();

  assert.equal(emptyListResponse.statusCode, 200);
  assert.deepEqual(emptyListResponse.json(), { tasks: [] });
  assert.equal(started.statusCode, 201);
  assert.equal(listResponse.statusCode, 200);
  assert.deepEqual(
    listPayload.tasks.map((task) => task.taskSlug),
    ["second-task", "first-task"]
  );

  await app.close();
});

void test("createGatewayApp reads a single managed task", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  const started = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/tasks",
    payload: {
      taskSlug: "second-task",
      mode: "git-branch"
    }
  });
  const readResponse = await app.inject({
    method: "GET",
    url: "/api/projects/landing-a/tasks/second-task"
  });
  const missingResponse = await app.inject({
    method: "GET",
    url: "/api/projects/landing-a/tasks/missing-task"
  });
  const startedPayload: ManagedTaskResponse = started.json();
  const readPayload: ManagedTaskResponse = readResponse.json();

  assert.equal(started.statusCode, 201);
  assert.equal(readResponse.statusCode, 200);
  assert.deepEqual(readPayload.task, startedPayload.task);
  assert.equal(missingResponse.statusCode, 404);

  await app.close();
});

void test("createGatewayApp reads managed task summary and validation artifacts", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/tasks",
    payload: {
      taskSlug: "artifact-task"
    }
  });
  fs.writeFileSync(
    path.join(
      rootDir,
      "storage",
      "managed-tasks",
      "landing-a",
      "artifact-task",
      "workspace",
      "landing-a",
      "src",
      "index.html"
    ),
    "<!doctype html>\n<html><body><h1>Artifact Task</h1></body></html>\n",
    "utf8"
  );
  await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/tasks/artifact-task/summarize"
  });
  await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/tasks/artifact-task/validate"
  });

  const summaryResponse = await app.inject({
    method: "GET",
    url: "/api/projects/landing-a/tasks/artifact-task/summary"
  });
  const validationResponse = await app.inject({
    method: "GET",
    url: "/api/projects/landing-a/tasks/artifact-task/validation"
  });
  const missingSummary = await app.inject({
    method: "GET",
    url: "/api/projects/landing-a/tasks/missing-task/summary"
  });
  const missingValidation = await app.inject({
    method: "GET",
    url: "/api/projects/landing-a/tasks/missing-task/validation"
  });
  const summaryPayload: {
    summary: { changedFiles: number };
  } = summaryResponse.json();
  const validationPayload: {
    validation: { status: string };
  } = validationResponse.json();

  assert.equal(summaryResponse.statusCode, 200);
  assert.equal(summaryPayload.summary.changedFiles, 1);
  assert.equal(validationResponse.statusCode, 200);
  assert.equal(validationPayload.validation.status, "validated");
  assert.equal(missingSummary.statusCode, 404);
  assert.equal(missingValidation.statusCode, 404);

  await app.close();
});

void test("createGatewayApp summarizes a managed task workspace", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  const startResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/tasks",
    payload: {
      taskSlug: "fix-copy"
    }
  });
  assert.equal(startResponse.statusCode, 201);

  fs.writeFileSync(
    path.join(
      rootDir,
      "storage",
      "managed-tasks",
      "landing-a",
      "fix-copy",
      "workspace",
      "landing-a",
      "src",
      "index.html"
    ),
    "<!doctype html>\n<html><body><h1>Landing A Updated</h1></body></html>\n",
    "utf8"
  );

  const summaryResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/tasks/fix-copy/summarize"
  });
  const payload: {
    summary: { changedFiles: number; changes: Array<{ path: string; kind: string }> };
  } = summaryResponse.json();

  assert.equal(summaryResponse.statusCode, 200);
  assert.equal(payload.summary.changedFiles, 1);
  assert.deepEqual(payload.summary.changes, [
    {
      path: "src/index.html",
      kind: "modified"
    }
  ]);

  await app.close();
});

void test("createGatewayApp validates a managed task workspace", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  const startResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/tasks",
    payload: {
      taskSlug: "fix-copy"
    }
  });
  assert.equal(startResponse.statusCode, 201);

  fs.writeFileSync(
    path.join(
      rootDir,
      "storage",
      "managed-tasks",
      "landing-a",
      "fix-copy",
      "workspace",
      "landing-a",
      "src",
      "index.html"
    ),
    "<!doctype html>\n<html><body><h1>Landing A Validated</h1></body></html>\n",
    "utf8"
  );

  const validationResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/tasks/fix-copy/validate"
  });
  const payload: {
    validation: { status: "validated"; changedFiles: number; summaryPath: string };
  } = validationResponse.json();

  assert.equal(validationResponse.statusCode, 200);
  assert.equal(payload.validation.status, "validated");
  assert.equal(payload.validation.changedFiles, 1);
  assert.match(payload.validation.summaryPath, /summary\.json$/);

  await app.close();
});

void test("createGatewayApp applies a managed task workspace back to the project", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  const startResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/tasks",
    payload: {
      taskSlug: "fix-copy"
    }
  });
  assert.equal(startResponse.statusCode, 201);

  const workspaceFilePath = path.join(
    rootDir,
    "storage",
    "managed-tasks",
    "landing-a",
    "fix-copy",
    "workspace",
    "landing-a",
    "src",
    "index.html"
  );
  fs.writeFileSync(
    workspaceFilePath,
    "<!doctype html>\n<html><body><h1>Landing A Applied</h1></body></html>\n",
    "utf8"
  );

  const applyResponse = await app.inject({
    method: "POST",
    url: "/api/projects/landing-a/tasks/fix-copy/apply"
  });
  const payload: {
    result: { status: "applied"; changedFiles: number; projectSlug: string };
  } = applyResponse.json();

  assert.equal(applyResponse.statusCode, 200);
  assert.equal(payload.result.status, "applied");
  assert.equal(payload.result.projectSlug, "landing-a");
  assert.equal(payload.result.changedFiles, 1);
  assert.match(
    fs.readFileSync(path.join(rootDir, "content-repo", "projects", "landing-a", "src", "index.html"), "utf8"),
    /Landing A Applied/
  );

  await app.close();
});
