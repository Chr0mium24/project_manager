import fs from "node:fs";
import path from "node:path";
import { PROJECT_RUNTIMES, SLUG_RE, VISIBILITY_VALUES, assert } from "./contracts.mjs";
import { validateContentRepo, validateProjectJson } from "./validators.mjs";

function nowIso() {
  return new Date().toISOString();
}

function defaultEntryForRuntime(runtime) {
  return runtime === "static" ? "src/index.html" : "src/server.ts";
}

function defaultRouteForRuntime(runtime, slug) {
  return runtime === "static" ? `/p/${slug}` : `/app/${slug}`;
}

function staticTemplate(name) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>${name}</title>
  </head>
  <body>
    <h1>${name}</h1>
  </body>
</html>
`;
}

function dynamicTemplate(slug) {
  return `export function handler() {
  return {
    ok: true,
    name: "${slug}"
  };
}
`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function createProject(contentRepoRoot, options) {
  const {
    slug,
    name,
    runtime,
    visibility = "private",
    force = false
  } = options;

  assert(typeof slug === "string" && SLUG_RE.test(slug), "slug is invalid");
  assert(typeof name === "string" && name.trim().length > 0 && name.length <= 120, "name is invalid");
  assert(typeof runtime === "string" && PROJECT_RUNTIMES.has(runtime), "runtime is invalid");
  assert(typeof visibility === "string" && VISIBILITY_VALUES.has(visibility), "visibility is invalid");

  const projectsDir = path.join(contentRepoRoot, "projects");
  const indexPath = path.join(contentRepoRoot, "projects-index.json");
  const projectDir = path.join(projectsDir, slug);
  const srcDir = path.join(projectDir, "src");
  const entry = defaultEntryForRuntime(runtime);
  const route = defaultRouteForRuntime(runtime, slug);

  assert(fs.existsSync(projectsDir), "projects directory is missing");
  assert(fs.existsSync(indexPath), "projects-index.json is missing");

  if (!force) {
    assert(!fs.existsSync(projectDir), `project already exists: ${slug}`);
  }

  fs.mkdirSync(srcDir, { recursive: true });

  const projectJson = validateProjectJson({
    schemaVersion: 1,
    name: name.trim(),
    slug,
    runtime,
    entry,
    route,
    visibility,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }, slug);

  writeJson(path.join(projectDir, "project.json"), projectJson);
  fs.writeFileSync(
    path.join(projectDir, entry),
    runtime === "static" ? staticTemplate(projectJson.name) : dynamicTemplate(slug),
    "utf8"
  );

  const index = readJson(indexPath);
  index.generatedAt = nowIso();
  index.projects = (index.projects || []).filter((item) => item.slug !== slug);
  index.projects.push({
    slug,
    path: `projects/${slug}`,
    name: projectJson.name,
    runtime,
    visibility,
    entry,
    route,
    updatedAt: projectJson.updatedAt
  });
  index.projects.sort((a, b) => a.slug.localeCompare(b.slug));
  writeJson(indexPath, index);

  validateContentRepo(contentRepoRoot);

  return {
    slug,
    runtime,
    route,
    entry
  };
}
