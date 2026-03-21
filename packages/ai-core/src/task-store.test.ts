import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { listAiTasks, readAiTask } from "./index.ts";
import { createTempRoot } from "./test-fixtures.ts";

void test("readAiTask throws when persisted task payload is missing required fields", () => {
  const rootDir = createTempRoot();
  const taskDir = path.join(rootDir, "storage", "ai-tasks", "legacy-task");
  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(path.join(taskDir, "task.json"), JSON.stringify({
    schemaVersion: 1,
    taskId: "legacy-task",
    kind: "managed-project-edit",
    status: "completed",
    projectSlug: "landing-a",
    taskSlug: "legacy",
    prompt: "Legacy payload missing fields.",
    createdAt: "2026-03-21T00:00:00.000Z",
    completedAt: "2026-03-21T00:00:01.000Z",
    managedTaskPath: "storage/managed-tasks/landing-a/legacy/task.json",
    workspaceProjectPath: "storage/managed-tasks/landing-a/legacy/workspace/landing-a",
    stdoutPath: null,
    stderrPath: null,
    summaryPath: null,
    validationPath: null,
    codexExitCode: 0,
    error: null,
    appliedAt: null
  }, null, 2), "utf8");

  assert.throws(() => readAiTask(rootDir, "legacy-task"), /parentTaskId/i);
  assert.deepEqual(listAiTasks(rootDir), []);
});
