import fs from "node:fs";
import path from "node:path";
import { PROJECT_RUNTIMES, ROUTE_RE, SLUG_RE, VISIBILITY_VALUES, assert, isIsoDateTime } from "./contracts.mjs";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function hasOnlyKeys(obj, allowedKeys) {
  return Object.keys(obj).every((key) => allowedKeys.has(key));
}

export function validateProjectJson(project, expectedSlug = null) {
  const allowedKeys = new Set([
    "schemaVersion",
    "name",
    "slug",
    "description",
    "runtime",
    "entry",
    "route",
    "visibility",
    "tags",
    "latestVersion",
    "mainLanguage",
    "framework",
    "owner",
    "createdAt",
    "updatedAt"
  ]);

  assert(isPlainObject(project), "project.json must be an object");
  assert(hasOnlyKeys(project, allowedKeys), "project.json contains unsupported keys");
  assert(project.schemaVersion === 1, "schemaVersion must be 1");
  assert(typeof project.name === "string" && project.name.trim().length > 0 && project.name.length <= 120, "name is invalid");
  assert(typeof project.slug === "string" && SLUG_RE.test(project.slug), "slug is invalid");
  assert(expectedSlug === null || project.slug === expectedSlug, "slug must match directory name");
  assert(typeof project.runtime === "string" && PROJECT_RUNTIMES.has(project.runtime), "runtime is invalid");
  assert(typeof project.entry === "string" && project.entry.startsWith("src/"), "entry must start with src/");
  assert(!project.entry.startsWith("drafts/"), "entry must not point into drafts/");
  assert(typeof project.route === "string" && ROUTE_RE.test(project.route), "route is invalid");
  assert(typeof project.visibility === "string" && VISIBILITY_VALUES.has(project.visibility), "visibility is invalid");
  assert(isIsoDateTime(project.createdAt), "createdAt must be an ISO datetime");
  assert(isIsoDateTime(project.updatedAt), "updatedAt must be an ISO datetime");
  if (project.runtime === "static") {
    assert(project.entry.endsWith(".html"), "static runtime entry must be an html file");
    assert(project.route.startsWith("/p/"), "static runtime route must start with /p/");
  }
  if (project.runtime === "dynamic") {
    assert(project.route.startsWith("/app/") || project.route.startsWith("/api/"), "dynamic runtime route must start with /app/ or /api/");
  }

  if ("description" in project) {
    assert(typeof project.description === "string" && project.description.length <= 500, "description is invalid");
  }
  if ("tags" in project) {
    assert(Array.isArray(project.tags), "tags must be an array");
    assert(project.tags.length <= 16, "tags must have at most 16 items");
    const seen = new Set();
    for (const tag of project.tags) {
      assert(typeof tag === "string" && tag.length >= 1 && tag.length <= 32, "tag is invalid");
      assert(!seen.has(tag), "tags must be unique");
      seen.add(tag);
    }
  }
  if ("latestVersion" in project) {
    assert(typeof project.latestVersion === "string" && project.latestVersion.length > 0 && project.latestVersion.length <= 64, "latestVersion is invalid");
  }
  if ("mainLanguage" in project) {
    assert(typeof project.mainLanguage === "string" && project.mainLanguage.length <= 32, "mainLanguage is invalid");
  }
  if ("framework" in project) {
    assert(typeof project.framework === "string" && project.framework.length <= 32, "framework is invalid");
  }
  if ("owner" in project) {
    assert(typeof project.owner === "string" && project.owner.length <= 64, "owner is invalid");
  }

  return project;
}

export function validateProjectsIndex(index) {
  const allowedKeys = new Set(["version", "generatedAt", "projects"]);

  assert(isPlainObject(index), "projects-index.json must be an object");
  assert(hasOnlyKeys(index, allowedKeys), "projects-index.json contains unsupported keys");
  assert(index.version === 1, "index version must be 1");
  assert(isIsoDateTime(index.generatedAt), "generatedAt must be an ISO datetime");
  assert(Array.isArray(index.projects), "projects must be an array");

  let lastSlug = "";
  for (const entry of index.projects) {
    assert(isPlainObject(entry), "index project entry must be an object");
    assert(typeof entry.slug === "string" && SLUG_RE.test(entry.slug), "index slug is invalid");
    assert(entry.slug > lastSlug, "projects index must be sorted by slug");
    lastSlug = entry.slug;
    assert(entry.path === `projects/${entry.slug}`, "index path must equal projects/<slug>");
    assert(typeof entry.name === "string" && entry.name.trim().length > 0 && entry.name.length <= 120, "index name is invalid");
    assert(typeof entry.runtime === "string" && PROJECT_RUNTIMES.has(entry.runtime), "index runtime is invalid");
    assert(typeof entry.visibility === "string" && VISIBILITY_VALUES.has(entry.visibility), "index visibility is invalid");
    assert(typeof entry.entry === "string" && entry.entry.startsWith("src/"), "index entry must start with src/");
    assert(typeof entry.route === "string" && ROUTE_RE.test(entry.route), "index route is invalid");
    assert(isIsoDateTime(entry.updatedAt), "index updatedAt must be an ISO datetime");
  }

  return index;
}

export function validateContentRepo(rootDir) {
  const projectsDir = path.join(rootDir, "projects");
  const indexPath = path.join(rootDir, "projects-index.json");

  assert(fs.existsSync(rootDir), "content-repo root is missing");
  assert(fs.existsSync(projectsDir), "projects directory is missing");
  assert(fs.existsSync(indexPath), "projects-index.json is missing");

  const index = validateProjectsIndex(readJson(indexPath));
  const projectDirs = fs.readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert(index.projects.length === projectDirs.length, "index project count does not match directory count");

  for (const slug of projectDirs) {
    assert(SLUG_RE.test(slug), `invalid project directory slug: ${slug}`);

    const projectDir = path.join(projectsDir, slug);
    const projectJsonPath = path.join(projectDir, "project.json");
    const srcDir = path.join(projectDir, "src");

    assert(fs.existsSync(projectJsonPath), `${slug} is missing project.json`);
    assert(fs.existsSync(srcDir), `${slug} is missing src/ directory`);

    const project = validateProjectJson(readJson(projectJsonPath), slug);
    const entryPath = path.join(projectDir, project.entry);
    assert(fs.existsSync(entryPath), `${slug} entry file does not exist: ${project.entry}`);

    const indexEntry = index.projects.find((entry) => entry.slug === slug);
    assert(indexEntry, `${slug} is missing from projects-index.json`);
    assert(indexEntry.name === project.name, `${slug} index name does not match project.json`);
    assert(indexEntry.runtime === project.runtime, `${slug} index runtime does not match project.json`);
    assert(indexEntry.visibility === project.visibility, `${slug} index visibility does not match project.json`);
    assert(indexEntry.entry === project.entry, `${slug} index entry does not match project.json`);
    assert(indexEntry.route === project.route, `${slug} index route does not match project.json`);
    assert(indexEntry.path === `projects/${slug}`, `${slug} index path is invalid`);

    const gitDir = path.join(projectDir, ".git");
    assert(!fs.existsSync(gitDir), `${slug} must not contain a nested .git directory`);
  }

  for (const indexEntry of index.projects) {
    const projectDir = path.join(rootDir, indexEntry.path);
    assert(fs.existsSync(projectDir), `index points to missing project directory: ${indexEntry.path}`);
  }

  return {
    projects: projectDirs.length
  };
}
