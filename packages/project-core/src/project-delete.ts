import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  getContentRepoRoot,
  getProjectRoot,
  getProjectsIndexPath,
  readProject,
  readProjectsIndex
} from "./content-repo.ts";
import { validateContentRepo } from "./content-repo-validation.ts";
import { slugRe, type ManagedProject } from "./schemas.ts";

const deleteProjectOptionsSchema = z.object({
  slug: z.string().regex(slugRe)
});

const storageProjectRoots = [
  ["storage", "managed-tasks"],
  ["storage", "project-versions"],
  ["storage", "static-builds"],
  ["storage", "dynamic-builds"]
] as const;

function nowIso(): string {
  return new Date().toISOString();
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function updateProjectsIndex(rootDir: string, slug: string): void {
  const currentIndex = readProjectsIndex(rootDir);
  writeJson(getProjectsIndexPath(rootDir), {
    version: currentIndex.version,
    generatedAt: nowIso(),
    projects: currentIndex.projects.filter((item) => item.slug !== slug)
  });
}

function removeProjectStorage(rootDir: string, slug: string): void {
  for (const rootParts of storageProjectRoots) {
    fs.rmSync(path.join(rootDir, ...rootParts, slug), {
      recursive: true,
      force: true
    });
  }
}

export function deleteProject(rootDir: string, slug: string): ManagedProject | null {
  const normalizedSlug = deleteProjectOptionsSchema.parse({ slug }).slug;
  const contentRepoRoot = getContentRepoRoot(rootDir);
  validateContentRepo(contentRepoRoot);

  const project = readProject(rootDir, normalizedSlug);
  if (project === null) {
    return null;
  }

  fs.rmSync(getProjectRoot(rootDir, normalizedSlug), {
    recursive: true,
    force: true
  });
  updateProjectsIndex(rootDir, normalizedSlug);
  removeProjectStorage(rootDir, normalizedSlug);
  validateContentRepo(contentRepoRoot);
  return project;
}
