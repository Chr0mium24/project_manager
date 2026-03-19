import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getProjectsIndexPath } from "./content-repo.ts";

export function createTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "project-core-"));
}

export function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeContentRepo(rootDir: string): void {
  const contentRepoRoot = path.join(rootDir, "content-repo");
  fs.mkdirSync(path.join(contentRepoRoot, "projects", "landing-a", "src"), { recursive: true });

  writeJson(getProjectsIndexPath(rootDir), {
    version: 1,
    generatedAt: "2026-03-20T00:00:00.000Z",
    projects: [
      {
        slug: "landing-a",
        path: "projects/landing-a",
        name: "Landing A",
        runtime: "static",
        visibility: "private",
        entry: "src/index.html",
        route: "/p/landing-a",
        updatedAt: "2026-03-20T00:00:00.000Z"
      }
    ]
  });

  writeJson(path.join(contentRepoRoot, "projects", "landing-a", "project.json"), {
    schemaVersion: 1,
    name: "Landing A",
    slug: "landing-a",
    description: "Official sample static project",
    runtime: "static",
    entry: "src/index.html",
    route: "/p/landing-a",
    visibility: "private",
    tags: ["landing", "sample"],
    latestVersion: "v1",
    mainLanguage: "html",
    framework: "vanilla",
    owner: "project-manager",
    createdAt: "2026-03-20T00:00:00.000Z",
    updatedAt: "2026-03-20T00:00:00.000Z"
  });
  fs.writeFileSync(
    path.join(contentRepoRoot, "projects", "landing-a", "src", "index.html"),
    "<!doctype html>\n<html><body><h1>Landing A</h1></body></html>\n",
    "utf8"
  );
}
