import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  applyAiTask,
  createAiTask,
  listAiTasks,
  readAiTask,
  readAiTaskDiagnostics,
  readAiTaskSummary,
  runAiTask
} from "./index.ts";
import { createTempRoot, writeContentRepo } from "./test-fixtures.ts";

void test("runAiTask completes a queued ai task and records artifacts", async () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const task = createAiTask(
    rootDir,
    {
      projectSlug: "landing-a",
      taskSlug: "fix-copy",
      prompt: "Update the landing page heading."
    },
  );
  const completedTask = await runAiTask(rootDir, task.taskId, {
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
        error: null,
        sessionId: "session-1"
      };
    }
  });
  const persistedTask = readAiTask(rootDir, task.taskId);

  assert.equal(task.status, "queued");
  assert.equal(completedTask.status, "completed");
  assert.notEqual(completedTask.summaryPath, null);
  assert.notEqual(completedTask.validationPath, null);
  assert.notEqual(completedTask.stdoutPath, null);
  assert.notEqual(completedTask.completedAt, null);
  assert.equal(completedTask.sessionId, "session-1");
  assert.notEqual(persistedTask, null);
  assert.equal(listAiTasks(rootDir).length, 1);
});

void test("runAiTask records failed codex executions", async () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const task = createAiTask(
    rootDir,
    {
      projectSlug: "landing-a",
      taskSlug: "broken-copy",
      prompt: "Break the task."
    }
  );
  const failedTask = await runAiTask(rootDir, task.taskId, {
    executor: () => ({
      exitCode: 1,
      stdout: "",
      stderr: "failed\n",
      error: null,
      sessionId: "session-2"
    })
  });

  assert.equal(task.status, "queued");
  assert.equal(failedTask.status, "failed");
  assert.equal(failedTask.summaryPath, null);
  assert.equal(failedTask.validationPath, null);
  assert.equal(failedTask.codexExitCode, 1);
});

void test("readAiTaskSummary returns the managed task summary for a completed ai task", async () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const task = createAiTask(
    rootDir,
    {
      projectSlug: "landing-a",
      taskSlug: "summary-copy",
      prompt: "Update the landing page heading."
    }
  );
  await runAiTask(rootDir, task.taskId, {
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
          error: null,
          sessionId: "session-3"
        };
      }
    });

  const summary = readAiTaskSummary(rootDir, task.taskId);

  assert.notEqual(summary, null);
  assert.equal(summary.changedFiles, 1);
});

void test("applyAiTask applies a completed ai task back to the managed project", async () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const task = createAiTask(
    rootDir,
    {
      projectSlug: "landing-a",
      taskSlug: "apply-copy",
      prompt: "Update the landing page heading."
    }
  );
  await runAiTask(rootDir, task.taskId, {
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
          error: null,
          sessionId: "session-4"
        };
      }
    });

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

void test("readAiTaskDiagnostics returns stdout, stderr, and session metadata", async () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const task = createAiTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "diagnostics-copy",
    prompt: "Update the landing page heading."
  });

  await runAiTask(rootDir, task.taskId, {
    executor: ({ cwd }) => {
      fs.writeFileSync(
        path.join(cwd, "src", "index.html"),
        "<!doctype html>\n<html><body><h1>Diagnostics Updated</h1></body></html>\n",
        "utf8"
      );
      return {
        exitCode: 0,
        stdout: "{\"type\":\"thread.started\",\"thread_id\":\"session-5\"}\n",
        stderr: "trace\n",
        error: null,
        sessionId: "session-5"
      };
    }
  });

  const diagnostics = readAiTaskDiagnostics(rootDir, task.taskId);

  assert.equal(diagnostics.sessionId, "session-5");
  assert.match(diagnostics.stdout, /thread.started/);
  assert.equal(diagnostics.stderr, "trace\n");
});

void test("runAiTask exposes live diagnostics while a task is still running", async () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const task = createAiTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "live-copy",
    prompt: "Stream progress while editing."
  });

  let resolveExec: ((result: {
    exitCode: number;
    stdout: string;
    stderr: string;
    error: null;
    sessionId: string;
  }) => void) | null = null;

  const runPromise = runAiTask(rootDir, task.taskId, {
    executor: (input) => new Promise((resolve) => {
      input.onStdout?.("step 1\n");
      input.onStderr?.("warn 1\n");
      resolveExec = resolve;
    })
  });

  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

  const runningDiagnostics = readAiTaskDiagnostics(rootDir, task.taskId);
  const runningTask = readAiTask(rootDir, task.taskId);

  assert.equal(runningTask?.status, "running");
  assert.equal(runningDiagnostics.status, "running");
  assert.match(runningDiagnostics.stdout, /step 1/);
  assert.match(runningDiagnostics.stderr, /warn 1/);

  resolveExec?.({
    exitCode: 0,
    stdout: "step 1\nstep 2\n",
    stderr: "warn 1\n",
    error: null,
    sessionId: "session-live"
  });
  await runPromise;
});

void test("createAiTask can continue from a previous task workspace", async () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const initialTask = createAiTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "first-pass",
    prompt: "Update the landing page heading."
  });
  await runAiTask(rootDir, initialTask.taskId, {
    executor: ({ cwd }) => {
      fs.writeFileSync(
        path.join(cwd, "src", "index.html"),
        "<!doctype html>\n<html><body><h1>First Pass</h1></body></html>\n",
        "utf8"
      );
      return {
        exitCode: 0,
        stdout: "{\"status\":\"ok\"}\n",
        stderr: "",
        error: null,
        sessionId: "session-6"
      };
    }
  });

  const followUpTask = createAiTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "second-pass",
    prompt: "Add a paragraph under the heading.",
    parentTaskId: initialTask.taskId
  });
  const seededWorkspace = fs.readFileSync(
    path.join(rootDir, followUpTask.workspaceProjectPath, "src", "index.html"),
    "utf8"
  );

  assert.equal(followUpTask.parentTaskId, initialTask.taskId);
  assert.equal(followUpTask.sessionId, "session-6");
  assert.match(seededWorkspace, /First Pass/);
});

void test("createAiTask auto-resolves a repeated task slug", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const firstTask = createAiTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "repeatable",
    prompt: "First run."
  });
  const secondTask = createAiTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "repeatable",
    prompt: "Second run."
  });

  assert.equal(firstTask.taskSlug, "repeatable");
  assert.equal(secondTask.taskSlug, "repeatable-2");
  assert.match(secondTask.taskId, /^repeatable-2-/);
});
