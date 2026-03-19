import fs from "node:fs";
import path from "node:path";
import { readProject } from "@project-manager/project-core";
import {
  getProjectSourceDir,
  getVersionMetadataPath,
  listProjectVersionRecords,
  readProjectVersion,
  type ProjectVersionRecord
} from "./project-version-record.ts";

export const moduleName = "@project-manager/git-core";

function nowIso(): string {
  return new Date().toISOString();
}

function getVersionTimestamp(): string {
  return nowIso().replace(/[:.]/g, "-");
}

function getVersionsRoot(rootDir: string): string {
  return path.join(rootDir, "storage", "project-versions");
}

function getProjectVersionsRoot(rootDir: string, slug: string): string {
  return path.join(getVersionsRoot(rootDir), slug);
}

function getVersionDir(rootDir: string, slug: string, versionId: string): string {
  return path.join(getProjectVersionsRoot(rootDir, slug), versionId);
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export { readProjectVersion, type ProjectVersionRecord } from "./project-version-record.ts";

export function listProjectVersions(rootDir: string, slug: string): ProjectVersionRecord[] {
  return listProjectVersionRecords(rootDir, slug);
}

export function createProjectVersion(
  rootDir: string,
  slug: string,
  message: string
): ProjectVersionRecord | null {
  const project = readProject(rootDir, slug);
  if (project === null) {
    return null;
  }

  const createdAt = nowIso();
  const versionId = getVersionTimestamp();
  const versionDir = getVersionDir(rootDir, slug, versionId);
  const snapshotDir = path.join(versionDir, "project");
  fs.mkdirSync(versionDir, { recursive: true });
  fs.cpSync(getProjectSourceDir(rootDir, slug), snapshotDir, { recursive: true });

  const record: ProjectVersionRecord = {
    slug,
    versionId,
    message,
    createdAt,
    snapshotPath: path.relative(rootDir, snapshotDir)
  };
  writeJson(getVersionMetadataPath(rootDir, slug, versionId), record);
  return record;
}

export function restoreProjectVersion(
  rootDir: string,
  slug: string,
  versionId: string
): ProjectVersionRecord | null {
  const version = readProjectVersion(rootDir, slug, versionId);
  if (version === null) {
    return null;
  }

  const snapshotDir = path.join(rootDir, version.snapshotPath);
  if (!fs.existsSync(snapshotDir) || !fs.statSync(snapshotDir).isDirectory()) {
    return null;
  }

  const projectDir = getProjectSourceDir(rootDir, slug);
  fs.rmSync(projectDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(projectDir), { recursive: true });
  fs.cpSync(snapshotDir, projectDir, { recursive: true });
  return version;
}

export {
  diffProjectVersion,
  type ProjectVersionDiff,
  type ProjectVersionDiffChange
} from "./project-version-diff.ts";
