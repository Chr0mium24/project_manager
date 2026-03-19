import fs from "node:fs";
import path from "node:path";
import { getProjectRoot, readProject } from "./content-repo.ts";

export interface ProjectFileRecord {
  path: string;
  size: number;
}

function normalizeProjectFilePath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function assertSafeRelativePath(relativePath: string): string {
  const normalizedPath = path.posix.normalize(relativePath);
  if (
    normalizedPath.startsWith("../") ||
    normalizedPath.includes("/../") ||
    normalizedPath === ".." ||
    normalizedPath.startsWith("/")
  ) {
    throw new Error(`unsafe project file path: ${relativePath}`);
  }

  return normalizedPath;
}

function collectProjectFiles(
  projectRoot: string,
  currentDir: string,
  collectedFiles: ProjectFileRecord[]
): ProjectFileRecord[] {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      collectProjectFiles(projectRoot, absolutePath, collectedFiles);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const relativePath = normalizeProjectFilePath(path.relative(projectRoot, absolutePath));
    collectedFiles.push({
      path: relativePath,
      size: fs.statSync(absolutePath).size
    });
  }

  return collectedFiles;
}

export function listProjectFiles(rootDir: string, slug: string): ProjectFileRecord[] | null {
  const project = readProject(rootDir, slug);
  if (project === null) {
    return null;
  }

  const projectRoot = getProjectRoot(rootDir, slug);
  return collectProjectFiles(projectRoot, projectRoot, []).sort((left, right) => left.path.localeCompare(right.path));
}

export function readProjectFile(rootDir: string, slug: string, relativePath: string): string | null {
  const project = readProject(rootDir, slug);
  if (project === null) {
    return null;
  }

  const safeRelativePath = assertSafeRelativePath(relativePath);
  const projectRoot = getProjectRoot(rootDir, slug);
  const absolutePath = path.join(projectRoot, safeRelativePath);

  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    return null;
  }

  return fs.readFileSync(absolutePath, "utf8");
}
