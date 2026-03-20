import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { cleanAiTaskArtifacts } from "../scripts/clean-ai-task-artifacts.mjs";

test("cleanAiTaskArtifacts removes ai task directories and their managed task directories", () => {
  const rootDir = path.join(os.tmpdir(), `project-manager-ai-clean-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const aiTaskDir = path.join(rootDir, "storage", "ai-tasks", "legacy-task");
  const managedTaskDir = path.join(rootDir, "storage", "managed-tasks", "landing-a", "legacy");
  const sourceProjectDir = path.join(rootDir, "content-repo", "projects", "landing-a");

  mkdirSync(aiTaskDir, { recursive: true });
  mkdirSync(managedTaskDir, { recursive: true });
  mkdirSync(sourceProjectDir, { recursive: true });
  writeFileSync(path.join(aiTaskDir, "task.json"), JSON.stringify({
    projectSlug: "landing-a",
    taskSlug: "legacy"
  }, null, 2), "utf8");
  writeFileSync(path.join(sourceProjectDir, "project.json"), "{\n}\n", "utf8");

  const cleanedTasks = cleanAiTaskArtifacts(rootDir, ["legacy-task"]);

  assert.deepEqual(cleanedTasks, [{
    taskId: "legacy-task",
    projectSlug: "landing-a",
    taskSlug: "legacy"
  }]);
  assert.equal(existsSync(aiTaskDir), false);
  assert.equal(existsSync(managedTaskDir), false);
  assert.equal(existsSync(path.join(sourceProjectDir, "project.json")), true);
});

test("cleanAiTaskArtifacts rejects unsafe task ids", () => {
  const rootDir = path.join(os.tmpdir(), `project-manager-ai-clean-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(rootDir, { recursive: true });

  assert.throws(() => cleanAiTaskArtifacts(rootDir, ["../legacy-task"]), /invalid taskId/);
});
