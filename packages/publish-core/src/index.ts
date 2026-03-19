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

export const moduleName = "@project-manager/publish-core";

function nowIso(): string {
  return new Date().toISOString();
}

function getStaticBuildRoot(rootDir: string): string {
  return path.join(rootDir, "storage", "static-builds");
}

function getProjectSourceDir(rootDir: string, slug: string): string {
  return path.join(rootDir, "content-repo", "projects", slug);
}

function getStaticBuildDir(rootDir: string, slug: string): string {
  return path.join(getStaticBuildRoot(rootDir), slug);
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

function writePublishMetadata(outputDir: string, result: StaticPublishResult): void {
  fs.writeFileSync(
    path.join(outputDir, "publish.json"),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8"
  );
}

export function readPublishedStaticEntry(rootDir: string, slug: string): string | null {
  const entryPath = path.join(getStaticBuildDir(rootDir, slug), "index.html");
  if (!fs.existsSync(entryPath) || !fs.statSync(entryPath).isFile()) {
    return null;
  }

  return fs.readFileSync(entryPath, "utf8");
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
