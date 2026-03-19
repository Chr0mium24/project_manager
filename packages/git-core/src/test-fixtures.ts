import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function createTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "git-core-"));
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeContentRepo(rootDir: string): void {
  const contentRepoRoot = path.join(rootDir, "content-repo");
  fs.mkdirSync(path.join(contentRepoRoot, "projects", "landing-a", "src"), { recursive: true });
  fs.mkdirSync(path.join(contentRepoRoot, "projects", "service-b", "src"), { recursive: true });

  writeJson(path.join(contentRepoRoot, "projects-index.json"), {
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
      },
      {
        slug: "service-b",
        path: "projects/service-b",
        name: "Service B",
        runtime: "dynamic",
        visibility: "private",
        entry: "src/server.ts",
        route: "/app/service-b",
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
  writeJson(path.join(contentRepoRoot, "projects", "service-b", "project.json"), {
    schemaVersion: 1,
    name: "Service B",
    slug: "service-b",
    description: "Official sample dynamic project",
    runtime: "dynamic",
    entry: "src/server.ts",
    route: "/app/service-b",
    visibility: "private",
    tags: ["service", "sample"],
    latestVersion: "v1",
    mainLanguage: "typescript",
    framework: "fastify",
    owner: "project-manager",
    createdAt: "2026-03-20T00:00:00.000Z",
    updatedAt: "2026-03-20T00:00:00.000Z"
  });

  fs.writeFileSync(
    path.join(contentRepoRoot, "projects", "landing-a", "src", "index.html"),
    "<!doctype html>\n<html><body><h1>Landing A</h1></body></html>\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(contentRepoRoot, "projects", "service-b", "src", "server.ts"),
    "export async function handler() { return { ok: true }; }\n",
    "utf8"
  );
}
