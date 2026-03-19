import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { getProjectsIndexPath } from "@project-manager/project-core";
import { executeDynamicRuntimeRequest } from "./runtime-api.ts";

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildDynamicProjectJson(slug: string): Record<string, unknown> {
  return {
    schemaVersion: 1,
    name: "Service B",
    slug,
    description: "Official sample dynamic project",
    runtime: "dynamic",
    entry: "src/server.ts",
    route: `/app/${slug}`,
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

function writeDynamicProject(rootDir: string, slug: string, handlerSource: string): void {
  const contentRepoRoot = path.join(rootDir, "content-repo");
  fs.mkdirSync(path.join(contentRepoRoot, "projects", slug, "src"), { recursive: true });

  writeJson(getProjectsIndexPath(rootDir), {
    version: 1,
    generatedAt: "2026-03-20T00:00:00.000Z",
    projects: [
      {
        slug,
        path: `projects/${slug}`,
        name: "Service B",
        runtime: "dynamic",
        visibility: "private",
        entry: "src/server.ts",
        route: `/app/${slug}`,
        updatedAt: "2026-03-20T00:00:00.000Z"
      }
    ]
  });

  writeJson(
    path.join(contentRepoRoot, "projects", slug, "project.json"),
    buildDynamicProjectJson(slug)
  );

  fs.writeFileSync(
    path.join(contentRepoRoot, "projects", slug, "src", "server.ts"),
    `${handlerSource}\n`,
    "utf8"
  );
}

void test("executeDynamicRuntimeRequest invokes the dynamic project handler", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-runtime-"));
  writeDynamicProject(
    rootDir,
    "service-b",
    [
      "export function handler(context) {",
      "  return {",
      '    ok: true,',
      '    slug: context.slug,',
      '    runtimePath: context.runtimePath,',
      '    method: context.method,',
      '    query: context.query,',
      '    body: context.body',
      "  };",
      "}"
    ].join("\n")
  );

  const response = await executeDynamicRuntimeRequest(rootDir, {
    pathname: "/api/runtime/service-b/status",
    method: "POST",
    query: {
      mode: "test",
      tag: ["a", "b"]
    },
    body: {
      count: 1
    }
  });

  assert.deepEqual(response, {
    statusCode: 200,
    body: {
      ok: true,
      slug: "service-b",
      runtimePath: "/status",
      method: "POST",
      query: {
        mode: "test",
        tag: ["a", "b"]
      },
      body: {
        count: 1
      }
    }
  });
});

void test("executeDynamicRuntimeRequest rejects missing or invalid handlers", async () => {
  const missingRootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-runtime-"));
  writeDynamicProject(missingRootDir, "service-b", "export const version = 1;");

  const missingHandler = await executeDynamicRuntimeRequest(missingRootDir, {
    pathname: "/api/runtime/service-b",
    method: "GET"
  });
  const missingProject = await executeDynamicRuntimeRequest(missingRootDir, {
    pathname: "/api/runtime/landing-a",
    method: "GET"
  });

  assert.deepEqual(missingHandler, {
    statusCode: 500,
    body: {
      error: "invalid-dynamic-handler",
      slug: "service-b"
    }
  });

  assert.deepEqual(missingProject, {
    statusCode: 404,
    body: {
      error: "dynamic-runtime-not-found",
      slug: "landing-a"
    }
  });
});

void test("executeDynamicRuntimeRequest converts handler exceptions into stable 500 payloads", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-runtime-"));
  writeDynamicProject(
    rootDir,
    "service-b",
    [
      "export function handler() {",
      '  throw new Error("boom");',
      "}"
    ].join("\n")
  );

  const failedHandler = await executeDynamicRuntimeRequest(rootDir, {
    pathname: "/api/runtime/service-b",
    method: "GET"
  });

  assert.deepEqual(failedHandler, {
    statusCode: 500,
    body: {
      error: "dynamic-handler-failed",
      slug: "service-b",
      message: "boom"
    }
  });
});
