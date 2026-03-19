import fs from "node:fs";
import path from "node:path";
import { readProject } from "@project-manager/project-core";

export interface StaticPublishResult {
  slug: string;
  runtime: "static";
  outputDir: string;
  entryPath: string;
  publishedAt: string;
}

export interface DynamicPublishResult {
  slug: string;
  runtime: "dynamic";
  outputDir: string;
  entryPath: string;
  route: string;
  publishedAt: string;
}

export const moduleName = "@project-manager/publish-core";

function nowIso(): string {
  return new Date().toISOString();
}

function getStaticBuildRoot(rootDir: string): string {
  return path.join(rootDir, "storage", "static-builds");
}

function getDynamicBuildRoot(rootDir: string): string {
  return path.join(rootDir, "storage", "dynamic-builds");
}

function getProjectSourceDir(rootDir: string, slug: string): string {
  return path.join(rootDir, "content-repo", "projects", slug);
}

function getStaticBuildDir(rootDir: string, slug: string): string {
  return path.join(getStaticBuildRoot(rootDir), slug);
}

function getDynamicBuildDir(rootDir: string, slug: string): string {
  return path.join(getDynamicBuildRoot(rootDir), slug);
}

function copyPublishSource(
  sourceDir: string,
  outputDir: string,
  entryPath: string
): void {
  const entryDir = path.dirname(entryPath);
  const publishSourceDir = path.join(sourceDir, entryDir);
  fs.cpSync(publishSourceDir, outputDir, { recursive: true });
}

function writePublishMetadata(
  outputDir: string,
  result: DynamicPublishResult | StaticPublishResult
): void {
  fs.writeFileSync(
    path.join(outputDir, "publish.json"),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8"
  );
}

function getPublishMetadataPath(rootDir: string, slug: string): string {
  return path.join(getStaticBuildDir(rootDir, slug), "publish.json");
}

function getDynamicPublishMetadataPath(rootDir: string, slug: string): string {
  return path.join(getDynamicBuildDir(rootDir, slug), "publish.json");
}

export function readStaticPublishRecord(rootDir: string, slug: string): StaticPublishResult | null {
  const metadataPath = getPublishMetadataPath(rootDir, slug);
  if (!fs.existsSync(metadataPath) || !fs.statSync(metadataPath).isFile()) {
    return null;
  }

  return JSON.parse(fs.readFileSync(metadataPath, "utf8")) as StaticPublishResult;
}

export function readDynamicPublishRecord(rootDir: string, slug: string): DynamicPublishResult | null {
  const metadataPath = getDynamicPublishMetadataPath(rootDir, slug);
  if (!fs.existsSync(metadataPath) || !fs.statSync(metadataPath).isFile()) {
    return null;
  }

  return JSON.parse(fs.readFileSync(metadataPath, "utf8")) as DynamicPublishResult;
}

export function listStaticPublishRecords(rootDir: string): StaticPublishResult[] {
  const staticBuildRoot = getStaticBuildRoot(rootDir);
  if (!fs.existsSync(staticBuildRoot) || !fs.statSync(staticBuildRoot).isDirectory()) {
    return [];
  }

  return fs.readdirSync(staticBuildRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readStaticPublishRecord(rootDir, entry.name))
    .filter((record): record is StaticPublishResult => record !== null)
    .sort((left, right) => left.slug.localeCompare(right.slug));
}

export function listDynamicPublishRecords(rootDir: string): DynamicPublishResult[] {
  const dynamicBuildRoot = getDynamicBuildRoot(rootDir);
  if (!fs.existsSync(dynamicBuildRoot) || !fs.statSync(dynamicBuildRoot).isDirectory()) {
    return [];
  }

  return fs.readdirSync(dynamicBuildRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readDynamicPublishRecord(rootDir, entry.name))
    .filter((record): record is DynamicPublishResult => record !== null)
    .sort((left, right) => left.slug.localeCompare(right.slug));
}

export function readPublishedStaticEntry(rootDir: string, slug: string): string | null {
  const entryPath = path.join(getStaticBuildDir(rootDir, slug), "index.html");
  if (!fs.existsSync(entryPath) || !fs.statSync(entryPath).isFile()) {
    return null;
  }

  return fs.readFileSync(entryPath, "utf8");
}

export function publishDynamicProject(rootDir: string, slug: string): DynamicPublishResult | null {
  const project = readProject(rootDir, slug);
  if (project === null) {
    return null;
  }
  if (project.runtime !== "dynamic") {
    throw new Error(`project is not dynamic: ${slug}`);
  }

  const sourceDir = getProjectSourceDir(rootDir, slug);
  const outputDir = getDynamicBuildDir(rootDir, slug);
  const publishedProjectDir = path.join(outputDir, "project");
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  fs.cpSync(sourceDir, publishedProjectDir, { recursive: true });

  const result: DynamicPublishResult = {
    slug,
    runtime: "dynamic",
    outputDir: path.relative(rootDir, outputDir),
    entryPath: path.join("project", project.entry),
    route: project.route,
    publishedAt: nowIso()
  };
  writePublishMetadata(outputDir, result);
  return result;
}

export function publishStaticProject(rootDir: string, slug: string): StaticPublishResult | null {
  const project = readProject(rootDir, slug);
  if (project === null) {
    return null;
  }
  if (project.runtime !== "static") {
    throw new Error(`project is not static: ${slug}`);
  }

  const sourceDir = getProjectSourceDir(rootDir, slug);
  const outputDir = getStaticBuildDir(rootDir, slug);
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  copyPublishSource(sourceDir, outputDir, project.entry);

  const publishedAt = nowIso();
  const result: StaticPublishResult = {
    slug,
    runtime: "static",
    outputDir: path.relative(rootDir, outputDir),
    entryPath: "index.html",
    publishedAt
  };
  writePublishMetadata(outputDir, result);
  return result;
}
