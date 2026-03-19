import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { publishDynamicProject } from "@project-manager/publish-core";
import {
  createGatewayApp,
  readRouteRegistry,
  resolveGatewayRequest
} from "./index.ts";
import {
  writeContentRepo,
  writeRegistry
} from "./test-fixtures.ts";

interface NotFoundResponse {
  kind?: string;
  error?: string;
  slug?: string;
}

function parseJsonResponse(body: string): unknown {
  return JSON.parse(body);
}

void test("readRouteRegistry falls back to an empty registry", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  const registry = readRouteRegistry(rootDir);

  assert.equal(registry.version, 1);
  assert.equal(registry.updatedAt, null);
  assert.deepEqual(registry.routes, []);
});

void test("resolveGatewayRequest handles platform and control routes without registry entries", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));

  assert.equal(resolveGatewayRequest(rootDir, "/").kind, "platform-ui");
  assert.equal(resolveGatewayRequest(rootDir, "/projects/demo").kind, "platform-ui");
  assert.equal(resolveGatewayRequest(rootDir, "/api/projects/demo").kind, "control-api");
  assert.equal(resolveGatewayRequest(rootDir, "/healthz").kind, "healthz");
});

void test("resolveGatewayRequest matches the longest managed route prefix", () => {
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

void test("createGatewayApp serves healthz and control API routes", async () => {
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

void test("createGatewayApp serves a single project document and 404 for missing slug", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  const existingProject = await app.inject({ method: "GET", url: "/api/projects/landing-a" });
  const missingProject = await app.inject({ method: "GET", url: "/api/projects/missing-project" });
  const existingPayload = parseJsonResponse(existingProject.body) as { slug: string; runtime: string };
  const missingPayload = parseJsonResponse(missingProject.body) as NotFoundResponse;

  assert.equal(existingProject.statusCode, 200);
  assert.equal(existingPayload.slug, "landing-a");
  assert.equal(existingPayload.runtime, "static");

  assert.equal(missingProject.statusCode, 404);
  assert.deepEqual(missingPayload, {
    error: "project-not-found",
    slug: "missing-project"
  });

  await app.close();
});

void test("createGatewayApp serves managed routes and 404s", async () => {
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
  const missingPayload = parseJsonResponse(missingRoute.body) as NotFoundResponse;

  assert.equal(managedRoute.statusCode, 200);
  assert.match(managedRoute.body, /Landing A/);
  assert.match(String(managedRoute.headers["content-type"]), /^text\/html/);
  assert.equal(missingRoute.statusCode, 404);
  assert.equal(missingPayload.kind, "not-found");

  await app.close();
});

void test("createGatewayApp serves dynamic project metadata from the formal content repo", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  const dynamicRoute = await app.inject({ method: "GET", url: "/app/service-b" });
  const wrongRuntime = await app.inject({ method: "GET", url: "/app/landing-a" });

  assert.equal(dynamicRoute.statusCode, 200);
  assert.deepEqual(dynamicRoute.json(), {
    slug: "service-b",
    runtime: "dynamic",
    route: "/app/service-b",
    entry: "src/server.ts",
    framework: "fastify",
    publishedAt: null
  });

  assert.equal(wrongRuntime.statusCode, 404);
  assert.deepEqual(wrongRuntime.json(), {
    error: "dynamic-project-not-found",
    slug: "landing-a"
  });

  await app.close();
});

void test("createGatewayApp serves published dynamic project metadata", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const publishResult = publishDynamicProject(rootDir, "service-b");
  const app = createGatewayApp(rootDir);

  assert.notEqual(publishResult, null);

  const dynamicRoute = await app.inject({ method: "GET", url: "/app/service-b" });

  assert.equal(dynamicRoute.statusCode, 200);
  assert.deepEqual(dynamicRoute.json(), {
    slug: "service-b",
    runtime: "dynamic",
    route: "/app/service-b",
    entry: "project/src/server.ts",
    framework: "fastify",
    publishedAt: publishResult.publishedAt
  });

  await app.close();
});

void test("createGatewayApp forwards runtime query and body to dynamic handlers", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  const runtimeResponse = await app.inject({
    method: "POST",
    url: "/api/runtime/service-b/status?mode=test",
    payload: {
      count: 1
    }
  });

  assert.equal(runtimeResponse.statusCode, 200);
  assert.deepEqual(runtimeResponse.json(), {
    ok: true,
    service: "service-b",
    runtimePath: "/status",
    method: "POST",
    query: {
      mode: "test"
    },
    body: {
      count: 1
    }
  });

  await app.close();
});
