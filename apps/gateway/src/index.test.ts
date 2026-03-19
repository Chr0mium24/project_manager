import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { getProjectsIndexPath } from "./content-repo.ts";
import {
  createGatewayApp,
  getRouteRegistryPath,
  readRouteRegistry,
  resolveGatewayRequest
} from "./index.ts";

function writeRegistry(rootDir: string, routes: Array<{
  routePrefix: string;
  targetKind: "internal-handler" | "static-build" | "dynamic-handler";
  targetRef: string;
}>): void {
  const registryPath = getRouteRegistryPath(rootDir);
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  fs.writeFileSync(registryPath, `${JSON.stringify({
    version: 1,
    updatedAt: "2026-03-20T00:00:00.000Z",
    routes
  }, null, 2)}\n`, "utf8");
}

function writeContentRepo(rootDir: string): void {
  const contentRepoRoot = path.join(rootDir, "content-repo");
  fs.mkdirSync(path.join(contentRepoRoot, "projects", "landing-a", "src"), { recursive: true });
  fs.mkdirSync(path.join(contentRepoRoot, "projects", "service-b", "src"), { recursive: true });

  fs.writeFileSync(getProjectsIndexPath(rootDir), `${JSON.stringify({
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
  }, null, 2)}\n`, "utf8");

  fs.writeFileSync(
    path.join(contentRepoRoot, "projects", "landing-a", "project.json"),
    `${JSON.stringify({
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
    }, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(contentRepoRoot, "projects", "service-b", "project.json"),
    `${JSON.stringify({
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
    }, null, 2)}\n`,
    "utf8"
  );
}

test("readRouteRegistry falls back to an empty registry", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  const registry = readRouteRegistry(rootDir);

  assert.equal(registry.version, 1);
  assert.equal(registry.updatedAt, null);
  assert.deepEqual(registry.routes, []);
});

test("resolveGatewayRequest handles platform and control routes without registry entries", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));

  assert.equal(resolveGatewayRequest(rootDir, "/").kind, "platform-ui");
  assert.equal(resolveGatewayRequest(rootDir, "/projects/demo").kind, "platform-ui");
  assert.equal(resolveGatewayRequest(rootDir, "/api/projects/demo").kind, "control-api");
  assert.equal(resolveGatewayRequest(rootDir, "/healthz").kind, "healthz");
});

test("resolveGatewayRequest matches the longest managed route prefix", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeRegistry(rootDir, [
    {
      routePrefix: "/app/demo",
      targetKind: "dynamic-handler",
      targetRef: "demo-runtime"
    },
    {
      routePrefix: "/app/demo/admin",
      targetKind: "internal-handler",
      targetRef: "demo-admin"
    },
    {
      routePrefix: "/p/landing-a",
      targetKind: "static-build",
      targetRef: "landing-a"
    }
  ]);

  const adminRoute = resolveGatewayRequest(rootDir, "/app/demo/admin/settings");
  const landingRoute = resolveGatewayRequest(rootDir, "/p/landing-a");
  const missingRoute = resolveGatewayRequest(rootDir, "/unknown");

  assert.deepEqual(adminRoute, {
    kind: "managed-route",
    pathname: "/app/demo/admin/settings",
    routePrefix: "/app/demo/admin",
    targetKind: "internal-handler",
    targetRef: "demo-admin"
  });
  assert.equal(landingRoute.targetKind, "static-build");
  assert.equal(missingRoute.kind, "not-found");
});

test("createGatewayApp serves healthz and control API routes", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  writeRegistry(rootDir, [
    {
      routePrefix: "/app/demo",
      targetKind: "dynamic-handler",
      targetRef: "demo-runtime"
    }
  ]);

  const app = createGatewayApp(rootDir);

  const healthz = await app.inject({ method: "GET", url: "/healthz" });
  const apiProjects = await app.inject({ method: "GET", url: "/api/projects" });

  assert.equal(healthz.statusCode, 200);
  assert.deepEqual(healthz.json(), {
    ok: true,
    service: "@project-manager/gateway"
  });

  assert.equal(apiProjects.statusCode, 200);
  assert.deepEqual(apiProjects.json(), {
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

  await app.close();
});

test("createGatewayApp serves a single project document and 404 for missing slug", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  const existingProject = await app.inject({ method: "GET", url: "/api/projects/landing-a" });
  const missingProject = await app.inject({ method: "GET", url: "/api/projects/missing-project" });

  assert.equal(existingProject.statusCode, 200);
  assert.equal(existingProject.json().slug, "landing-a");
  assert.equal(existingProject.json().runtime, "static");

  assert.equal(missingProject.statusCode, 404);
  assert.deepEqual(missingProject.json(), {
    error: "project-not-found",
    slug: "missing-project"
  });

  await app.close();
});

test("createGatewayApp serves managed routes and 404s", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  writeRegistry(rootDir, [
    {
      routePrefix: "/p/landing-a",
      targetKind: "static-build",
      targetRef: "landing-a"
    }
  ]);

  const app = createGatewayApp(rootDir);

  const managedRoute = await app.inject({ method: "GET", url: "/p/landing-a" });
  const missingRoute = await app.inject({ method: "GET", url: "/missing" });

  assert.equal(managedRoute.statusCode, 200);
  assert.equal(managedRoute.json().targetKind, "static-build");
  assert.equal(missingRoute.statusCode, 404);
  assert.equal(missingRoute.json().kind, "not-found");

  await app.close();
});
