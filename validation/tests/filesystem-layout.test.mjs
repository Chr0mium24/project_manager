import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { validateContentRepo } from "../lib/validators.mjs";

test("validates the example content-repo fixture", () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(currentDir, "../content-repo");
  const result = validateContentRepo(rootDir);
  const index = JSON.parse(fs.readFileSync(path.join(rootDir, "projects-index.json"), "utf8"));

  assert.equal(result.projects, index.projects.length);
  assert.ok(index.projects.some((project) => project.slug === "landing-a"));
  assert.ok(index.projects.some((project) => project.slug === "service-b"));
});
