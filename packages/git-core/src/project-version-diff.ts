import fs from "node:fs";
import path from "node:path";
import { readProject } from "@project-manager/project-core";
import {
  getProjectSourceDir,
  readProjectVersion
} from "./project-version-record.ts";

export interface ProjectVersionDiffChange {
  path: string;
  kind: "added" | "deleted" | "modified";
}

export interface ProjectVersionDiff {
  slug: string;
  versionId: string;
  baseVersionId: string | null;
  changedFiles: number;
  changes: ProjectVersionDiffChange[];
}

function listFiles(rootDir: string, currentDir: string = rootDir, result: string[] = []): string[] {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      listFiles(rootDir, fullPath, result);
      continue;
    }

    if (entry.isFile()) {
      result.push(path.relative(rootDir, fullPath));
    }
  }

  return result.sort();
}

function buildDiff(baseDir: string, targetDir: string): ProjectVersionDiffChange[] {
  const baseFiles = new Set(listFiles(baseDir));
  const targetFiles = new Set(listFiles(targetDir));
  const allFiles = [...new Set([...baseFiles, ...targetFiles])].sort();
  const changes: ProjectVersionDiffChange[] = [];

  for (const relativePath of allFiles) {
    const baseExists = baseFiles.has(relativePath);
    const targetExists = targetFiles.has(relativePath);

    if (!baseExists && targetExists) {
      changes.push({ path: relativePath, kind: "added" });
      continue;
    }

    if (baseExists && !targetExists) {
      changes.push({ path: relativePath, kind: "deleted" });
      continue;
    }

    const baseContent = fs.readFileSync(path.join(baseDir, relativePath), "utf8");
    const targetContent = fs.readFileSync(path.join(targetDir, relativePath), "utf8");
    if (baseContent !== targetContent) {
      changes.push({ path: relativePath, kind: "modified" });
    }
  }

  return changes;
}

function resolveBaseDir(rootDir: string, slug: string, baseVersionId?: string): string | null {
  if (baseVersionId === undefined) {
    const project = readProject(rootDir, slug);
    const projectDir = getProjectSourceDir(rootDir, slug);
    if (project === null || !fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
      return null;
    }

    return projectDir;
  }

  const baseVersion = readProjectVersion(rootDir, slug, baseVersionId);
  if (baseVersion === null) {
    return null;
  }

  const snapshotDir = path.join(rootDir, baseVersion.snapshotPath);
  if (!fs.existsSync(snapshotDir) || !fs.statSync(snapshotDir).isDirectory()) {
    return null;
  }

  return snapshotDir;
}

export function diffProjectVersion(
  rootDir: string,
  slug: string,
  versionId: string,
  baseVersionId?: string
): ProjectVersionDiff | null {
  const targetVersion = readProjectVersion(rootDir, slug, versionId);
  if (targetVersion === null) {
    return null;
  }

  const targetDir = path.join(rootDir, targetVersion.snapshotPath);
  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    return null;
  }

  const baseDir = resolveBaseDir(rootDir, slug, baseVersionId);
  if (baseDir === null) {
    return null;
  }

  const changes = buildDiff(baseDir, targetDir);
  return {
    slug,
    versionId,
    baseVersionId: baseVersionId ?? null,
    changedFiles: changes.length,
    changes
  };
}
