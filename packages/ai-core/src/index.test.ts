import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  applyAiTask,
  createAiTask,
  listAiTasks,
  readAiTask,
  readAiTaskSummary
} from "./index.ts";
import { createTempRoot, writeContentRepo } from "./test-fixtures.ts";

void test("createAiTask runs codex against a managed workspace and records artifacts", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const task = createAiTask(
    rootDir,
    {
      projectSlug: "landing-a",
      taskSlug: "fix-copy",
      prompt: "Update the landing page heading."
    },
    {
      executor: ({ cwd }) => {
        fs.writeFileSync(
          path.join(cwd, "src", "index.html"),
          "<!doctype html>\n<html><body><h1>Landing A Updated</h1></body></html>\n",
          "utf8"
        );
        return {
          exitCode: 0,
          stdout: "{\"status\":\"ok\"}\n",
          stderr: "",
          error: null
        };
      }
    }
  );

  const persistedTask = readAiTask(rootDir, task.taskId);

  assert.equal(task.status, "completed");
  assert.notEqual(task.summaryPath, null);
  assert.notEqual(task.validationPath, null);
  assert.notEqual(task.stdoutPath, null);
  assert.notEqual(task.completedAt, null);
  assert.notEqual(persistedTask, null);
  assert.equal(listAiTasks(rootDir).length, 1);
});

void test("createAiTask records failed codex executions", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const task = createAiTask(
    rootDir,
    {
      projectSlug: "landing-a",
      taskSlug: "broken-copy",
      prompt: "Break the task."
    },
    {
      executor: () => ({
        exitCode: 1,
        stdout: "",
        stderr: "failed\n",
        error: null
      })
    }
  );

  assert.equal(task.status, "failed");
  assert.equal(task.summaryPath, null);
  assert.equal(task.validationPath, null);
  assert.equal(task.codexExitCode, 1);
});

void test("readAiTaskSummary returns the managed task summary for a completed ai task", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const task = createAiTask(
    rootDir,
    {
      projectSlug: "landing-a",
      taskSlug: "summary-copy",
      prompt: "Update the landing page heading."
    },
    {
      executor: ({ cwd }) => {
        fs.writeFileSync(
          path.join(cwd, "src", "index.html"),
          "<!doctype html>\n<html><body><h1>Summary Updated</h1></body></html>\n",
          "utf8"
        );
        return {
          exitCode: 0,
          stdout: "{\"status\":\"ok\"}\n",
          stderr: "",
          error: null
        };
      }
    }
  );

  const summary = readAiTaskSummary(rootDir, task.taskId);

  assert.notEqual(summary, null);
  assert.equal(summary.changedFiles, 1);
});

void test("applyAiTask applies a completed ai task back to the managed project", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const task = createAiTask(
    rootDir,
    {
      projectSlug: "landing-a",
      taskSlug: "apply-copy",
      prompt: "Update the landing page heading."
    },
    {
      executor: ({ cwd }) => {
        fs.writeFileSync(
          path.join(cwd, "src", "index.html"),
          "<!doctype html>\n<html><body><h1>Applied Updated</h1></body></html>\n",
          "utf8"
        );
        return {
          exitCode: 0,
          stdout: "{\"status\":\"ok\"}\n",
          stderr: "",
          error: null
        };
      }
    }
  );

  const result = applyAiTask(rootDir, task.taskId);
  const updatedProject = fs.readFileSync(
    path.join(rootDir, "content-repo", "projects", "landing-a", "src", "index.html"),
    "utf8"
  );
  const persistedTask = readAiTask(rootDir, task.taskId);

  assert.equal(result.status, "applied");
  assert.match(updatedProject, /Applied Updated/);
  assert.notEqual(persistedTask, null);
  assert.notEqual(persistedTask.appliedAt, null);
});
