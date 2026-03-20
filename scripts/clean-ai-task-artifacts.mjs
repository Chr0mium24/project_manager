import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

function assertSafeSegment(value, label) {
  if (typeof value !== "string" || !/^[A-Za-z0-9._-]+$/.test(value)) {
    throw new Error(`invalid ${label}`);
  }

  return value;
}

function resolveRepoPath(rootDir, relativePath) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  const allowedPrefix = `${resolvedRoot}${path.sep}`;

  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(allowedPrefix)) {
    throw new Error(`refusing to clean path outside repository: ${relativePath}`);
  }

  return resolvedPath;
}

function readManagedTaskLocator(taskPath) {
  if (!existsSync(taskPath) || !statSync(taskPath).isFile()) {
    return null;
  }

  const rawValue = JSON.parse(readFileSync(taskPath, "utf8"));
  if (typeof rawValue !== "object" || rawValue === null || Array.isArray(rawValue)) {
    return null;
  }

  const { projectSlug, taskSlug } = rawValue;
  if (typeof projectSlug !== "string" || typeof taskSlug !== "string") {
    return null;
  }

  return {
    projectSlug: assertSafeSegment(projectSlug, "projectSlug"),
    taskSlug: assertSafeSegment(taskSlug, "taskSlug")
  };
}

export function cleanAiTaskArtifacts(rootDir, requestedTaskIds) {
  if (!Array.isArray(requestedTaskIds) || requestedTaskIds.length === 0) {
    throw new Error("expected at least one ai task id");
  }

  return requestedTaskIds.map((requestedTaskId) => {
    const taskId = assertSafeSegment(requestedTaskId, "taskId");
    const aiTaskDir = resolveRepoPath(rootDir, path.join("storage", "ai-tasks", taskId));
    const locator = readManagedTaskLocator(path.join(aiTaskDir, "task.json"));

    rmSync(aiTaskDir, { force: true, recursive: true });

    if (locator !== null) {
      const managedTaskDir = resolveRepoPath(
        rootDir,
        path.join("storage", "managed-tasks", locator.projectSlug, locator.taskSlug)
      );
      rmSync(managedTaskDir, { force: true, recursive: true });
    }

    return {
      taskId,
      projectSlug: locator?.projectSlug ?? null,
      taskSlug: locator?.taskSlug ?? null
    };
  });
}

function main() {
  try {
    const cleanedTasks = cleanAiTaskArtifacts(process.cwd(), process.argv.slice(2));
    cleanedTasks.forEach((task) => {
      const managedLabel = task.projectSlug === null || task.taskSlug === null
        ? "managed=unknown"
        : `managed=${task.projectSlug}/${task.taskSlug}`;
      console.log(`[clean-ai-task-artifacts] ${task.taskId} ${managedLabel}`);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown clean error";
    console.error(`[clean-ai-task-artifacts] ${message}`);
    process.exit(1);
  }
}

if (import.meta.url === new URL(process.argv[1], "file://").href) {
  main();
}
