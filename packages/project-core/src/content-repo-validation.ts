import fs from "node:fs";
import path from "node:path";
import {
  projectJsonSchema,
  projectsIndexSchema,
  slugRe,
  type ManagedProject,
  type ProjectsIndex
} from "./schemas.ts";

export interface ContentRepoValidationSummary {
  projects: number;
}

function fail(message: string): never {
  throw new Error(message);
}

function parseJsonFile<T>(filePath: string, parser: { parse(value: unknown): T }): T {
  const rawValue = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return parser.parse(rawValue);
}

function validateProjectsIndex(index: ProjectsIndex): ProjectsIndex {
  let previousSlug = "";

  for (const entry of index.projects) {
    if (!entry.entry.startsWith("src/")) {
      fail(`index entry must start with src/: ${entry.slug}`);
    }
    if (entry.path !== `projects/${entry.slug}`) {
      fail(`index path must equal projects/<slug>: ${entry.slug}`);
    }
    if (entry.slug <= previousSlug) {
      fail("projects-index.json must be sorted by slug");
    }
    if (entry.runtime === "static" && !entry.route.startsWith("/p/")) {
      fail(`static project route must start with /p/: ${entry.slug}`);
    }
    if (entry.runtime === "dynamic" && !entry.route.startsWith("/app/")) {
      fail(`dynamic project route must start with /app/: ${entry.slug}`);
    }

    previousSlug = entry.slug;
  }

  return index;
}

function validateProject(project: ManagedProject, expectedSlug: string): ManagedProject {
  if (project.slug !== expectedSlug) {
    fail(`project slug must match directory name: ${expectedSlug}`);
  }
  if (!project.entry.startsWith("src/")) {
    fail(`project entry must start with src/: ${expectedSlug}`);
  }
  if (project.entry.startsWith("drafts/")) {
    fail(`project entry must not point into drafts/: ${expectedSlug}`);
  }
  if (project.runtime === "static") {
    if (!project.entry.endsWith(".html")) {
      fail(`static project entry must be an html file: ${expectedSlug}`);
    }
    if (project.route !== `/p/${project.slug}`) {
      fail(`static project route must equal /p/<slug>: ${expectedSlug}`);
    }
  }
  if (project.runtime === "dynamic" && project.route !== `/app/${project.slug}`) {
    fail(`dynamic project route must equal /app/<slug>: ${expectedSlug}`);
  }

  const uniqueTags = new Set(project.tags);
  if (uniqueTags.size !== project.tags.length) {
    fail(`project tags must be unique: ${expectedSlug}`);
  }

  return project;
}

function assertProjectMatchesIndex(project: ManagedProject, index: ProjectsIndex, slug: string): void {
  const indexEntry = index.projects.find((entry) => entry.slug === slug);
  if (indexEntry === undefined) {
    fail(`project missing from projects-index.json: ${slug}`);
  }
  if (indexEntry.name !== project.name) {
    fail(`index name does not match project.json: ${slug}`);
  }
  if (indexEntry.runtime !== project.runtime) {
    fail(`index runtime does not match project.json: ${slug}`);
  }
  if (indexEntry.visibility !== project.visibility) {
    fail(`index visibility does not match project.json: ${slug}`);
  }
  if (indexEntry.entry !== project.entry) {
    fail(`index entry does not match project.json: ${slug}`);
  }
  if (indexEntry.route !== project.route) {
    fail(`index route does not match project.json: ${slug}`);
  }
  if (indexEntry.path !== `projects/${slug}`) {
    fail(`index path is invalid: ${slug}`);
  }
}

export function validateContentRepo(contentRepoRoot: string): ContentRepoValidationSummary {
  const projectsDir = path.join(contentRepoRoot, "projects");
  const indexPath = path.join(contentRepoRoot, "projects-index.json");

  if (!fs.existsSync(contentRepoRoot)) {
    fail(`content-repo root is missing: ${contentRepoRoot}`);
  }
  if (!fs.existsSync(projectsDir)) {
    fail("projects directory is missing");
  }
  if (!fs.existsSync(indexPath)) {
    fail("projects-index.json is missing");
  }

  const index = validateProjectsIndex(parseJsonFile(indexPath, projectsIndexSchema));
  const projectDirs = fs.readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (index.projects.length !== projectDirs.length) {
    fail("index project count does not match directory count");
  }

  for (const slug of projectDirs) {
    if (!slugRe.test(slug)) {
      fail(`invalid project directory slug: ${slug}`);
    }

    const projectDir = path.join(projectsDir, slug);
    const projectJsonPath = path.join(projectDir, "project.json");
    const srcDir = path.join(projectDir, "src");

    if (!fs.existsSync(projectJsonPath)) {
      fail(`project.json is missing: ${slug}`);
    }
    if (!fs.existsSync(srcDir)) {
      fail(`src directory is missing: ${slug}`);
    }
    if (fs.existsSync(path.join(projectDir, ".git"))) {
      fail(`nested .git directory is forbidden: ${slug}`);
    }

    const project = validateProject(parseJsonFile(projectJsonPath, projectJsonSchema), slug);
    const entryPath = path.join(projectDir, project.entry);
    if (!fs.existsSync(entryPath)) {
      fail(`entry file does not exist: ${slug}:${project.entry}`);
    }

    assertProjectMatchesIndex(project, index, slug);
  }

  for (const indexEntry of index.projects) {
    if (!fs.existsSync(path.join(contentRepoRoot, indexEntry.path))) {
      fail(`index points to a missing project directory: ${indexEntry.path}`);
    }
  }

  return { projects: projectDirs.length };
}
