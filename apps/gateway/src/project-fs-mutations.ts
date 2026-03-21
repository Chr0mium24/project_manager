import fs from "node:fs";
import path from "node:path";
import {
  getProjectJsonPath,
  getProjectRoot,
  getProjectsIndexPath,
  readProject,
  readProjectsIndex
} from "@project-manager/project-core";

interface ProjectFileDeleteResult {
  path: string;
  updatedAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeRelativePath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function assertSafeRelativePath(filePath: string): string {
  const normalizedPath = normalizeRelativePath(path.posix.normalize(filePath));
  if (
    normalizedPath.length === 0
    || normalizedPath === "."
    || normalizedPath.startsWith("../")
    || normalizedPath.includes("/../")
    || path.posix.isAbsolute(normalizedPath)
  ) {
    throw new Error("invalid project file path");
  }

  return normalizedPath;
}

function updateProjectTimestamp(rootDir: string, slug: string, updatedAt: string): void {
  const project = readProject(rootDir, slug);
  if (project !== null) {
    writeJson(getProjectJsonPath(rootDir, slug), {
      ...project,
      updatedAt
    });
  }

  const index = readProjectsIndex(rootDir);
  writeJson(getProjectsIndexPath(rootDir), {
    ...index,
    generatedAt: updatedAt,
    projects: index.projects.map((entry) => entry.slug === slug ? { ...entry, updatedAt } : entry)
  });
}

function removeEmptyProjectDirectories(projectRoot: string, currentDir: string): void {
  if (currentDir === projectRoot || fs.readdirSync(currentDir).length > 0) {
    return;
  }

  fs.rmdirSync(currentDir);
  removeEmptyProjectDirectories(projectRoot, path.dirname(currentDir));
}

export function updateProjectDescription(rootDir: string, slug: string, description: string) {
  const project = readProject(rootDir, slug);
  if (project === null) {
    return null;
  }

  const updatedAt = nowIso();
  const nextProject = {
    ...project,
    description,
    updatedAt
  };
  writeJson(getProjectJsonPath(rootDir, slug), nextProject);
  updateProjectTimestamp(rootDir, slug, updatedAt);
  return nextProject;
}

export function deleteProjectFileFromRepo(
  rootDir: string,
  slug: string,
  relativePath: string
): ProjectFileDeleteResult | null {
  const project = readProject(rootDir, slug);
  if (project === null) {
    return null;
  }

  const safeRelativePath = assertSafeRelativePath(relativePath);
  if (safeRelativePath === "project.json") {
    throw new Error("cannot delete project manifest");
  }

  const projectRoot = getProjectRoot(rootDir, slug);
  const absolutePath = path.join(projectRoot, safeRelativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    return null;
  }

  fs.unlinkSync(absolutePath);
  removeEmptyProjectDirectories(projectRoot, path.dirname(absolutePath));
  const updatedAt = nowIso();
  updateProjectTimestamp(rootDir, slug, updatedAt);
  return {
    path: safeRelativePath,
    updatedAt
  };
}
