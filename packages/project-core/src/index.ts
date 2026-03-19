import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const projectIndexEntrySchema = z.object({
  slug: z.string().min(1),
  path: z.string().min(1),
  name: z.string().min(1),
  runtime: z.enum(["static", "dynamic"]),
  visibility: z.enum(["private", "public"]),
  entry: z.string().min(1),
  route: z.string().min(1),
  updatedAt: z.string().min(1)
});

const projectsIndexSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string().min(1),
  projects: z.array(projectIndexEntrySchema)
});

const projectJsonSchema = z.object({
  schemaVersion: z.number().int().positive(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string(),
  runtime: z.enum(["static", "dynamic"]),
  entry: z.string().min(1),
  route: z.string().min(1),
  visibility: z.enum(["private", "public"]),
  tags: z.array(z.string()),
  latestVersion: z.string().min(1),
  mainLanguage: z.string().min(1),
  framework: z.string().min(1),
  owner: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

export type ProjectIndexEntry = z.infer<typeof projectIndexEntrySchema>;
export type ProjectsIndex = z.infer<typeof projectsIndexSchema>;
export type ManagedProject = z.infer<typeof projectJsonSchema>;

export const moduleName = "@project-manager/project-core";

export function getContentRepoRoot(rootDir: string): string {
  return path.join(rootDir, "content-repo");
}

export function getProjectsIndexPath(rootDir: string): string {
  return path.join(getContentRepoRoot(rootDir), "projects-index.json");
}

function readJson<T>(filePath: string, schema: z.ZodType<T>): T {
  const rawValue = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return schema.parse(rawValue);
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
