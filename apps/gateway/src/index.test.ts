import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
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
    kind: "control-api",
    pathname: "/api/projects",
    routePrefix: null,
    targetKind: null,
    targetRef: null,
    registryVersion: 1,
    routeCount: 1
  });

  await app.close();
});

test("createGatewayApp serves managed routes and 404s", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
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
