import fs from "node:fs";
import path from "node:path";

export const TEST_ADMIN_TOKEN = "test-admin-token";

export function authHeaders(token: string = TEST_ADMIN_TOKEN): { authorization: string } {
  return {
    authorization: `Bearer ${token}`
  };
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildProjectsIndex(): {
  version: number;
  generatedAt: string;
  projects: Array<Record<string, string>>;
} {
  return {
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
  };
}

function buildProjectJson(runtime: "static" | "dynamic"): Record<string, unknown> {
  if (runtime === "static") {
    return {
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
    };
  }

  return {
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
  };
}

export function writeRegistry(rootDir: string, routes: Array<{
  routePrefix: string;
  targetKind: "internal-handler" | "static-build" | "dynamic-handler";
  targetRef: string;
}>): void {
  const registryPath = path.join(rootDir, "storage", "route-registry", "dev-routes.json");
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  fs.writeFileSync(registryPath, `${JSON.stringify({
    version: 1,
    updatedAt: "2026-03-20T00:00:00.000Z",
    routes
  }, null, 2)}\n`, "utf8");
}

export function writeContentRepo(rootDir: string): void {
  const contentRepoRoot = path.join(rootDir, "content-repo");
  fs.mkdirSync(path.join(contentRepoRoot, "projects", "landing-a", "src"), { recursive: true });
  fs.mkdirSync(path.join(contentRepoRoot, "projects", "service-b", "src"), { recursive: true });

  writeJson(path.join(contentRepoRoot, "projects-index.json"), buildProjectsIndex());
  writeJson(path.join(contentRepoRoot, "projects", "landing-a", "project.json"), buildProjectJson("static"));
  writeJson(path.join(contentRepoRoot, "projects", "service-b", "project.json"), buildProjectJson("dynamic"));

  fs.writeFileSync(
    path.join(contentRepoRoot, "projects", "landing-a", "src", "index.html"),
    "<!doctype html>\n<html><body><h1>Landing A</h1></body></html>\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(contentRepoRoot, "projects", "service-b", "src", "server.ts"),
    [
      "export function handler(context) {",
      "  return {",
      '    ok: true,',
      '    service: "service-b",',
      '    runtimePath: context.runtimePath,',
      '    method: context.method,',
      '    query: context.query,',
      '    body: context.body',
      "  };",
      "}"
    ].join("\n") + "\n",
    "utf8"
  );
}
