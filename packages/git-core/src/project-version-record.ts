import fs from "node:fs";
import path from "node:path";

export interface ProjectVersionRecord {
  slug: string;
  versionId: string;
  message: string;
  createdAt: string;
  snapshotPath: string;
}

export function getProjectSourceDir(rootDir: string, slug: string): string {
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

export function getVersionMetadataPath(rootDir: string, slug: string, versionId: string): string {
  return path.join(getVersionDir(rootDir, slug, versionId), "version.json");
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

export function listProjectVersionRecords(rootDir: string, slug: string): ProjectVersionRecord[] {
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
