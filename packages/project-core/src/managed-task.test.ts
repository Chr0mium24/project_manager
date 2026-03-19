import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  applyManagedTask,
  createProject,
  deleteManagedTask,
  listManagedTasks,
  readManagedTask,
  readManagedTaskSummary,
  readManagedTaskValidation,
  readProjectEntry,
  startManagedTask,
  summarizeManagedTask,
  validateManagedTask
} from "./index.ts";
import { createTempRoot, writeContentRepo } from "./test-fixtures.ts";

void test("startManagedTask creates an isolated formal workspace and manifest", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const result = startManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "fix-copy",
    mode: "workspace"
  });

  assert.equal(result.manifest.projectSlug, "landing-a");
  assert.equal(result.manifest.taskSlug, "fix-copy");
  assert.equal(result.manifest.targetCount, 1);
  assert.equal(result.manifest.commitPolicy, "final-result-only");
  assert.equal(result.manifest.prPolicy, "forbidden");
  assert.equal(result.manifest.branchName, null);
  assert.equal(fs.existsSync(result.manifestPath), true);
  assert.equal(
    fs.existsSync(path.join(rootDir, result.manifest.workspaceProjectPath, "project.json")),
    true
  );
});

void test("startManagedTask produces branch metadata for git-branch mode", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);
  createProject(rootDir, {
    slug: "service-b",
    name: "Service B",
    runtime: "dynamic"
  });

  const result = startManagedTask(rootDir, {
    projectSlug: "service-b",
    taskSlug: "fix-handler",
    mode: "git-branch"
  });

  assert.equal(result.manifest.branchName, "task/service-b--fix-handler");
  assert.equal(result.manifest.prPolicy, "forbidden");
});

void test("startManagedTask rejects unknown managed projects", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  assert.throws(
    () =>
      startManagedTask(rootDir, {
        projectSlug: "missing-project",
        taskSlug: "fix-copy",
        mode: "workspace"
      }),
    /managed project not found/
  );
});

void test("startManagedTask with force recreates a clean task directory", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const started = startManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "redo-copy",
    mode: "workspace"
  });

  fs.writeFileSync(path.join(started.taskRoot, "summary.json"), "{\"stale\":true}\n", "utf8");
  fs.writeFileSync(path.join(started.taskRoot, "validation.json"), "{\"stale\":true}\n", "utf8");

  const restarted = startManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "redo-copy",
    mode: "workspace",
    force: true
  });

  assert.equal(fs.existsSync(path.join(restarted.taskRoot, "summary.json")), false);
  assert.equal(fs.existsSync(path.join(restarted.taskRoot, "validation.json")), false);
  assert.equal(fs.existsSync(restarted.manifestPath), true);
});

void test("summarizeManagedTask writes a formal summary artifact without applying changes", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const started = startManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "fix-copy",
    mode: "workspace"
  });
  fs.writeFileSync(
    path.join(started.workspaceProjectDir, "src", "index.html"),
    "<!doctype html>\n<html><body><h1>Landing A Updated</h1></body></html>\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(started.workspaceProjectDir, "src", "extra.js"),
    "console.log('extra');\n",
    "utf8"
  );

  const summary = summarizeManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "fix-copy"
  });
  const persistedSummary = JSON.parse(fs.readFileSync(started.summaryPath, "utf8")) as {
    changedFiles: number;
    changes: Array<{ path: string; kind: string }>;
  };

  assert.equal(summary.projectSlug, "landing-a");
  assert.equal(summary.taskSlug, "fix-copy");
  assert.equal(summary.changedFiles, 2);
  assert.deepEqual(
    summary.changes.map((item) => `${item.kind}:${item.path}`),
    ["added:src/extra.js", "modified:src/index.html"]
  );
  assert.equal(persistedSummary.changedFiles, 2);
  assert.deepEqual(
    persistedSummary.changes.map((item) => `${item.kind}:${item.path}`),
    ["added:src/extra.js", "modified:src/index.html"]
  );
  assert.match(readProjectEntry(rootDir, "landing-a") ?? "", /Landing A<\/h1>/);
});

void test("validateManagedTask writes a formal validation artifact after summarizing", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const started = startManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "validate-copy",
    mode: "workspace"
  });
  fs.writeFileSync(
    path.join(started.workspaceProjectDir, "src", "index.html"),
    "<!doctype html>\n<html><body><h1>Landing A Validated</h1></body></html>\n",
    "utf8"
  );

  const validation = validateManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "validate-copy"
  });
  const persistedValidation = JSON.parse(fs.readFileSync(started.validationPath, "utf8")) as {
    status: string;
    changedFiles: number;
    summaryPath: string;
  };
  const persistedManifest = JSON.parse(fs.readFileSync(started.manifestPath, "utf8")) as {
    status?: string;
    lastValidatedAt?: string;
  };

  assert.equal(validation.projectSlug, "landing-a");
  assert.equal(validation.taskSlug, "validate-copy");
  assert.equal(validation.status, "validated");
  assert.equal(validation.changedFiles, 1);
  assert.match(
    validation.summaryPath,
    /storage\/managed-tasks\/landing-a\/validate-copy\/summary\.json$/
  );
  assert.equal(persistedValidation.status, "validated");
  assert.equal(persistedValidation.changedFiles, 1);
  assert.equal(persistedValidation.summaryPath, validation.summaryPath);
  assert.equal(persistedManifest.status, "validated");
  assert.notEqual(persistedManifest.lastValidatedAt, undefined);
});

void test("validateManagedTask rejects invalid workspace project shape", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const started = startManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "invalid-workspace",
    mode: "workspace"
  });
  fs.writeFileSync(
    path.join(started.workspaceProjectDir, "project.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        name: "Landing A",
        slug: "landing-a",
        description: "Broken static project",
        runtime: "static",
        entry: "src/index.html",
        route: "/app/landing-a",
        visibility: "private",
        tags: ["landing"],
        latestVersion: "v1",
        mainLanguage: "html",
        framework: "vanilla",
        owner: "project-manager",
        createdAt: "2026-03-20T00:00:00.000Z",
        updatedAt: "2026-03-20T00:00:00.000Z"
      },
      null,
      2
    ),
    "utf8"
  );

  assert.throws(
    () =>
      validateManagedTask(rootDir, {
        projectSlug: "landing-a",
        taskSlug: "invalid-workspace"
      }),
    /static project route must start with \/p\/|static project route must equal \/p\/<slug>/
  );
});

void test("applyManagedTask writes validated workspace changes back to the source project", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const started = startManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "apply-copy",
    mode: "workspace"
  });
  fs.writeFileSync(
    path.join(started.workspaceProjectDir, "src", "index.html"),
    "<!doctype html>\n<html><body><h1>Landing A Applied</h1></body></html>\n",
    "utf8"
  );

  const applied = applyManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "apply-copy"
  });
  const persistedManifest = JSON.parse(fs.readFileSync(started.manifestPath, "utf8")) as {
    status?: string;
    lastValidatedAt?: string;
    lastAppliedAt?: string;
  };

  assert.equal(applied.projectSlug, "landing-a");
  assert.equal(applied.taskSlug, "apply-copy");
  assert.equal(applied.changedFiles, 1);
  assert.equal(applied.status, "applied");
  assert.notEqual(applied.lastAppliedAt, undefined);
  assert.equal(persistedManifest.status, "applied");
  assert.notEqual(persistedManifest.lastValidatedAt, undefined);
  assert.notEqual(persistedManifest.lastAppliedAt, undefined);
  assert.match(readProjectEntry(rootDir, "landing-a") ?? "", /Landing A Applied/);
});

void test("applyManagedTask rejects missing managed task manifests", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  assert.throws(
    () =>
      applyManagedTask(rootDir, {
        projectSlug: "landing-a",
        taskSlug: "missing-task"
      }),
    /managed task manifest not found/
  );
});

void test("managed task records can be listed and read", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  startManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "first-task",
    mode: "workspace"
  });
  const second = startManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "second-task",
    mode: "git-branch"
  });

  assert.equal(readManagedTask(rootDir, "landing-a", "missing-task"), null);
  assert.deepEqual(readManagedTask(rootDir, "landing-a", "second-task"), second.manifest);
  assert.deepEqual(
    listManagedTasks(rootDir, "landing-a").map((task) => task.taskSlug),
    ["second-task", "first-task"]
  );
});

void test("managed task summary and validation artifacts can be read", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const started = startManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "artifact-task",
    mode: "workspace"
  });
  fs.writeFileSync(
    path.join(started.workspaceProjectDir, "src", "index.html"),
    "<!doctype html>\n<html><body><h1>Artifact Task</h1></body></html>\n",
    "utf8"
  );
  const summary = summarizeManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "artifact-task"
  });
  const validation = validateManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "artifact-task"
  });
  const persistedSummary = readManagedTaskSummary(rootDir, "landing-a", "artifact-task");
  const persistedValidation = readManagedTaskValidation(rootDir, "landing-a", "artifact-task");

  assert.equal(readManagedTaskSummary(rootDir, "landing-a", "missing-task"), null);
  assert.equal(readManagedTaskValidation(rootDir, "landing-a", "missing-task"), null);
  assert.notEqual(persistedSummary, null);
  assert.notEqual(persistedValidation, null);
  assert.deepEqual(persistedSummary, {
    ...summary,
    generatedAt: persistedSummary.generatedAt
  });
  assert.deepEqual(persistedValidation, validation);
});

void test("deleteManagedTask removes a managed task workspace", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  const started = startManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "delete-me",
    mode: "workspace"
  });
  const deleted = deleteManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "delete-me"
  });

  assert.notEqual(deleted, null);
  assert.equal(deleted.taskSlug, "delete-me");
  assert.equal(fs.existsSync(started.taskRoot), false);
  assert.equal(readManagedTask(rootDir, "landing-a", "delete-me"), null);
  assert.deepEqual(listManagedTasks(rootDir, "landing-a"), []);
});

void test("deleteManagedTask returns null for missing tasks", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  assert.equal(deleteManagedTask(rootDir, {
    projectSlug: "landing-a",
    taskSlug: "missing-task"
  }), null);
});
