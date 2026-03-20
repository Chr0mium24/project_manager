import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createAiTaskQueue } from "./task-queue.ts";
import { readAiTask } from "./index.ts";
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
        error: null
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
