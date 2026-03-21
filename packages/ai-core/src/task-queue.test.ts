import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createAiTask } from "./task-runner.ts";
import { createAiTaskQueue } from "./task-queue.ts";
import { readAiTask } from "./index.ts";
import { writeAiTaskRecord } from "./task-store.ts";
import { createTempRoot, writeContentRepo } from "./test-fixtures.ts";

void test("AiTaskQueue enqueues and completes tasks asynchronously", async () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);
  let releaseTask: (() => void) | null = null;
  const taskStarted = new Promise<void>((resolve) => {
    releaseTask = resolve;
  });
  const queue = createAiTaskQueue(rootDir, {
    executor: async ({ cwd }) => {
      await taskStarted;
      fs.writeFileSync(
        path.join(cwd, "src", "index.html"),
        "<!doctype html>\n<html><body><h1>Queued Updated</h1></body></html>\n",
        "utf8"
      );
      return {
        exitCode: 0,
        stdout: "{\"status\":\"ok\"}\n",
        stderr: "",
        error: null,
        sessionId: "session-queue"
      };
    }
  });

  const task = queue.enqueue({
    projectSlug: "landing-a",
    taskSlug: "queued-copy",
    prompt: "Update the landing page heading."
  });

  assert.equal(task.status, "queued");
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

  const runningTask = readAiTask(rootDir, task.taskId);
  assert.notEqual(runningTask, null);
  assert.equal(runningTask.status, "running");

  releaseTask?.();
  await queue.waitForIdle();

  const completedTask = readAiTask(rootDir, task.taskId);
  assert.notEqual(completedTask, null);
  assert.equal(completedTask.status, "completed");
});

void test("AiTaskQueue recovers a running task after process restart", async () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);
  const task = createAiTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "resume-copy",
    prompt: "Resume the interrupted task."
  });
  writeAiTaskRecord(rootDir, {
    ...task,
    status: "running"
  });

  const queue = createAiTaskQueue(rootDir, {
    executor: async ({ cwd }) => {
      await Promise.resolve();
      fs.writeFileSync(
        path.join(cwd, "src", "index.html"),
        "<!doctype html>\n<html><body><h1>Recovered task</h1></body></html>\n",
        "utf8"
      );
      return {
        exitCode: 0,
        stdout: "recovered\n",
        stderr: "",
        error: null,
        sessionId: "session-recovered"
      };
    }
  });

  await queue.waitForIdle();

  const completedTask = readAiTask(rootDir, task.taskId);
  assert.notEqual(completedTask, null);
  assert.equal(completedTask.status, "completed");
  assert.equal(completedTask.sessionId, "session-recovered");
});
