import fs from "node:fs";
import path from "node:path";
import { readProject } from "@project-manager/project-core";

export interface ProjectVersionRecord {
  slug: string;
  versionId: string;
  message: string;
  createdAt: string;
  snapshotPath: string;
}

export const moduleName = "@project-manager/git-core";

function nowIso(): string {
  return new Date().toISOString();
}

function getVersionTimestamp(): string {
  return nowIso().replace(/[:.]/g, "-");
}

function getProjectSourceDir(rootDir: string, slug: string): string {
  return path.join(rootDir, "content-repo", "projects", slug);
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

function getVersionMetadataPath(rootDir: string, slug: string, versionId: string): string {
  return path.join(getVersionDir(rootDir, slug, versionId), "version.json");
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readProjectVersion(
  rootDir: string,
  slug: string,
  versionId: string
): ProjectVersionRecord | null {
  const metadataPath = getVersionMetadataPath(rootDir, slug, versionId);
  if (!fs.existsSync(metadataPath) || !fs.statSync(metadataPath).isFile()) {
    return null;
  }

  return JSON.parse(fs.readFileSync(metadataPath, "utf8")) as ProjectVersionRecord;
}

export function listProjectVersions(rootDir: string, slug: string): ProjectVersionRecord[] {
  const versionsRoot = getProjectVersionsRoot(rootDir, slug);
  if (!fs.existsSync(versionsRoot) || !fs.statSync(versionsRoot).isDirectory()) {
    return [];
  }

  return fs.readdirSync(versionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readProjectVersion(rootDir, slug, entry.name))
    .filter((record): record is ProjectVersionRecord => record !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
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
