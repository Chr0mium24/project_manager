import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  projectJsonSchema,
  projectsIndexSchema,
  type ManagedProject,
  type ProjectIndexEntry,
  type ProjectsIndex
} from "./schemas.ts";

export interface CreateProjectOptions {
  slug: string;
  name: string;
  runtime: "static" | "dynamic";
  visibility?: "private" | "public";
  force?: boolean;
}

function readJson<T>(filePath: string, schema: z.ZodType<T>): T {
  const rawValue: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return schema.parse(rawValue);
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultEntryForRuntime(runtime: "static" | "dynamic"): string {
  return runtime === "static" ? "src/index.html" : "src/server.ts";
}

function defaultRouteForRuntime(runtime: "static" | "dynamic", slug: string): string {
  return runtime === "static" ? `/p/${slug}` : `/app/${slug}`;
}

function renderStaticTemplate(name: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>${name}</title>
  </head>
  <body>
    <main>
      <h1>${name}</h1>
    </main>
  </body>
</html>
`;
}

function renderDynamicTemplate(slug: string): string {
  return `export function handler(context) {
  return {
    ok: true,
    service: "${slug}",
    runtimePath: context.runtimePath,
    method: context.method
  };
}
`;
}

export function getContentRepoRoot(rootDir: string): string {
  return path.join(rootDir, "content-repo");
}

export function getProjectsIndexPath(rootDir: string): string {
  return path.join(getContentRepoRoot(rootDir), "projects-index.json");
}

export function readProjectsIndex(rootDir: string): ProjectsIndex {
  return readJson(getProjectsIndexPath(rootDir), projectsIndexSchema);
}

export function listProjects(rootDir: string): ProjectIndexEntry[] {
  return readProjectsIndex(rootDir).projects;
}

export function getProjectRoot(rootDir: string, slug: string): string {
  return path.join(getContentRepoRoot(rootDir), "projects", slug);
}

export function getProjectJsonPath(rootDir: string, slug: string): string {
  return path.join(getProjectRoot(rootDir, slug), "project.json");
}

export function readProject(rootDir: string, slug: string): ManagedProject | null {
  const projectPath = getProjectJsonPath(rootDir, slug);
  if (!fs.existsSync(projectPath)) {
    return null;
  }

  return readJson(projectPath, projectJsonSchema);
}

export function getProjectEntryPath(rootDir: string, slug: string): string | null {
  const project = readProject(rootDir, slug);
  if (project === null) {
    return null;
  }

  return path.join(getProjectRoot(rootDir, slug), project.entry);
}

export function readProjectEntry(rootDir: string, slug: string): string | null {
  const entryPath = getProjectEntryPath(rootDir, slug);
  if (entryPath === null || !fs.existsSync(entryPath)) {
    return null;
  }

  return fs.readFileSync(entryPath, "utf8");
}

export function createProject(rootDir: string, options: CreateProjectOptions): ManagedProject {
  const normalizedOptions = z.object({
    slug: z.string().min(1),
    name: z.string().min(1).max(120),
    runtime: z.enum(["static", "dynamic"]),
    visibility: z.enum(["private", "public"]).default("private"),
    force: z.boolean().default(false)
  }).parse(options);

  const projectRoot = getProjectRoot(rootDir, normalizedOptions.slug);
  const entry = defaultEntryForRuntime(normalizedOptions.runtime);
  const route = defaultRouteForRuntime(normalizedOptions.runtime, normalizedOptions.slug);
  const timestamp = nowIso();

  if (fs.existsSync(projectRoot)) {
    if (!normalizedOptions.force) {
      throw new Error(`project already exists: ${normalizedOptions.slug}`);
    }
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }

  fs.mkdirSync(path.join(projectRoot, "src"), { recursive: true });

  const project = projectJsonSchema.parse({
    schemaVersion: 1,
    name: normalizedOptions.name.trim(),
    slug: normalizedOptions.slug,
    description: `Managed ${normalizedOptions.runtime} project`,
    runtime: normalizedOptions.runtime,
    entry,
    route,
    visibility: normalizedOptions.visibility,
    tags: [],
    latestVersion: "v1",
    mainLanguage: normalizedOptions.runtime === "static" ? "html" : "typescript",
    framework: normalizedOptions.runtime === "static" ? "vanilla" : "fastify",
    owner: "project-manager",
    createdAt: timestamp,
    updatedAt: timestamp
  });

  writeJson(getProjectJsonPath(rootDir, normalizedOptions.slug), project);
  fs.writeFileSync(
    path.join(projectRoot, entry),
    normalizedOptions.runtime === "static"
      ? renderStaticTemplate(project.name)
      : renderDynamicTemplate(project.slug),
    "utf8"
  );

  const index = readProjectsIndex(rootDir);
  const nextIndex = projectsIndexSchema.parse({
    version: index.version,
    generatedAt: timestamp,
    projects: [
      ...index.projects.filter((item) => item.slug !== project.slug),
      {
        slug: project.slug,
        path: `projects/${project.slug}`,
        name: project.name,
        runtime: project.runtime,
        visibility: project.visibility,
        entry: project.entry,
        route: project.route,
        updatedAt: project.updatedAt
      }
    ].sort((left, right) => left.slug.localeCompare(right.slug))
  });
  writeJson(getProjectsIndexPath(rootDir), nextIndex);

  return project;
}
