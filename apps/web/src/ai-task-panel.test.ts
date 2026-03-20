import assert from "node:assert/strict";
import test from "node:test";
import {
  AiTaskApiClient,
  type AiTaskClient,
  type AiTaskRecord,
  type CreateAiTaskInput,
  type ManagedTaskSummary
} from "./ai-task-api.ts";
import { AiTaskPanelController } from "./ai-task-panel.ts";

function createTaskRecord(overrides: Partial<AiTaskRecord> = {}): AiTaskRecord {
  return {
    schemaVersion: 1,
    taskId: "task-1",
    kind: "managed-project-edit",
    status: "queued",
    projectSlug: "landing-a",
    taskSlug: "fix-copy",
    prompt: "Update the heading.",
    createdAt: "2026-03-20T00:00:00.000Z",
    completedAt: null,
    managedTaskPath: "storage/managed-tasks/landing-a/fix-copy/task.json",
    workspaceProjectPath: "storage/managed-tasks/landing-a/fix-copy/workspace/landing-a",
    stdoutPath: null,
    stderrPath: null,
    summaryPath: null,
    validationPath: null,
    codexExitCode: null,
    error: null,
    appliedAt: null,
    ...overrides
  };
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
}

void test("AiTaskApiClient creates tasks with bearer auth and parses queued payloads", async () => {
  let capturedAuthHeader: string | null = null;
  const client = new AiTaskApiClient({
    adminToken: "secret-token",
    fetch: (input, init) => {
      capturedAuthHeader = new Headers(init?.headers).get("authorization");
      assert.equal(getRequestUrl(input), "/api/ai/tasks");
      assert.equal(init?.method, "POST");
      return Promise.resolve(Response.json({
        task: createTaskRecord()
      }, { status: 202 }));
    }
  });

  const task = await client.createTask({
    projectSlug: "landing-a",
    taskSlug: "fix-copy",
    prompt: "Update the heading."
  });

  assert.equal(capturedAuthHeader, "Bearer secret-token");
  assert.equal(task.status, "queued");
});

void test("AiTaskPanelController waits for completion and loads the summary artifact", async () => {
  const queuedTask = createTaskRecord();
  const completedTask = createTaskRecord({
    status: "completed",
    completedAt: "2026-03-20T00:00:05.000Z",
    summaryPath: "storage/ai-tasks/task-1/summary.json",
    validationPath: "storage/ai-tasks/task-1/validation.json"
  });
  const summary: ManagedTaskSummary = {
    projectSlug: "landing-a",
    taskSlug: "fix-copy",
    generatedAt: "2026-03-20T00:00:05.000Z",
    changedFiles: 1,
    changes: [
      { path: "src/index.html", kind: "modified" }
    ]
  };
  const client: AiTaskClient = {
    listTasks() {
      return Promise.resolve([completedTask]);
    },
    readTask() {
      return Promise.resolve(completedTask);
    },
    readSummary() {
      return Promise.resolve(summary);
    },
    createTask(input: CreateAiTaskInput) {
      assert.equal(input.projectSlug, "landing-a");
      return Promise.resolve(queuedTask);
    },
    applyTask() {
      return Promise.reject(new Error("apply should not be called"));
    },
    waitForTask(taskId: string) {
      assert.equal(taskId, queuedTask.taskId);
      return Promise.resolve(completedTask);
    }
  };
  const controller = new AiTaskPanelController(client);

  await controller.createTask({
    projectSlug: "landing-a",
    taskSlug: "fix-copy",
    prompt: "Update the heading."
  });

  assert.equal(controller.state.isBusy, false);
  assert.equal(controller.state.selectedTask?.status, "completed");
  assert.equal(controller.state.summary?.changedFiles, 1);
  assert.equal(controller.state.tasks.length, 1);
  assert.equal(controller.state.error, null);
});
