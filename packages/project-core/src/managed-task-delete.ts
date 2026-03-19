import fs from "node:fs";
import { z } from "zod";
import { getContentRepoRoot } from "./content-repo.ts";
import { validateContentRepo } from "./content-repo-validation.ts";
import { readManagedTask } from "./managed-task-query.ts";
import { getManagedTaskPaths, type ManagedTaskManifest } from "./managed-task.ts";
import { slugRe } from "./schemas.ts";

interface DeleteManagedTaskOptions {
  projectSlug: string;
  taskSlug: string;
}

export function deleteManagedTask(
  rootDir: string,
  options: DeleteManagedTaskOptions
): ManagedTaskManifest | null {
  const normalizedOptions = z.object({
    projectSlug: z.string().regex(slugRe),
    taskSlug: z.string().regex(slugRe)
  }).parse(options);

  validateContentRepo(getContentRepoRoot(rootDir));

  const task = readManagedTask(
    rootDir,
    normalizedOptions.projectSlug,
    normalizedOptions.taskSlug
  );
  if (task === null) {
    return null;
  }

  const taskPaths = getManagedTaskPaths(
    rootDir,
    normalizedOptions.projectSlug,
    normalizedOptions.taskSlug
  );
  fs.rmSync(taskPaths.taskRoot, { recursive: true, force: true });
  return task;
}
