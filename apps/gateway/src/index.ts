import fs from "node:fs";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export type RouteTargetKind = "internal-handler" | "static-build" | "dynamic-handler";

export interface RouteRecord {
  routePrefix: string;
  targetKind: RouteTargetKind;
  targetRef: string;
  updatedAt?: string;
}

export interface RouteRegistry {
  version: number;
  updatedAt: string | null;
  routes: RouteRecord[];
}

export interface GatewayResolution {
  kind: "healthz" | "platform-ui" | "control-api" | "managed-route" | "not-found";
  pathname: string;
  routePrefix: string | null;
  targetKind: RouteTargetKind | null;
  targetRef: string | null;
}

export const moduleName = "@project-manager/gateway";
export const REGISTRY_VERSION = 1;

export function getRouteRegistryPath(rootDir: string): string {
  return path.join(rootDir, "storage", "route-registry", "dev-routes.json");
}

export function readRouteRegistry(rootDir: string): RouteRegistry {
  const registryPath = getRouteRegistryPath(rootDir);
  if (!fs.existsSync(registryPath)) {
    return { version: REGISTRY_VERSION, updatedAt: null, routes: [] };
  }

  return JSON.parse(fs.readFileSync(registryPath, "utf8")) as RouteRegistry;
}

function matchesRoutePrefix(pathname: string, routePrefix: string): boolean {
  return pathname === routePrefix || pathname.startsWith(`${routePrefix}/`);
}

function findBestManagedRoute(pathname: string, routes: RouteRecord[]): RouteRecord | null {
  const matches = routes
    .filter((route) => matchesRoutePrefix(pathname, route.routePrefix))
    .sort((left, right) => right.routePrefix.length - left.routePrefix.length);

  return matches[0] ?? null;
}

export function resolveGatewayRequest(rootDir: string, pathname: string): GatewayResolution {
  if (pathname === "/healthz") {
    return {
      kind: "healthz",
      pathname,
      routePrefix: null,
      targetKind: null,
      targetRef: null
    };
  }

  if (
    pathname === "/" ||
    pathname === "/projects" ||
    pathname.startsWith("/projects/") ||
    pathname.startsWith("/assets/")
  ) {
    return {
      kind: "platform-ui",
      pathname,
      routePrefix: null,
      targetKind: null,
      targetRef: null
    };
  }

  if (
    pathname.startsWith("/api/projects") ||
    pathname.startsWith("/api/ai") ||
    pathname.startsWith("/api/publish")
  ) {
    return {
      kind: "control-api",
      pathname,
      routePrefix: null,
      targetKind: null,
      targetRef: null
    };
  }

  const matchedRoute = findBestManagedRoute(pathname, readRouteRegistry(rootDir).routes);
  if (!matchedRoute) {
    return {
      kind: "not-found",
      pathname,
      routePrefix: null,
      targetKind: null,
      targetRef: null
    };
  }

  return {
    kind: "managed-route",
    pathname,
    routePrefix: matchedRoute.routePrefix,
    targetKind: matchedRoute.targetKind,
    targetRef: matchedRoute.targetRef
  };
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(`${JSON.stringify(body, null, 2)}\n`);
}

export function createGatewayHandler(rootDir: string) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    const pathname = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
    const resolution = resolveGatewayRequest(rootDir, pathname);

    if (resolution.kind === "healthz") {
      sendJson(res, 200, { ok: true, service: moduleName });
      return;
    }

    if (resolution.kind === "not-found") {
      sendJson(res, 404, resolution);
      return;
    }

    sendJson(res, 200, resolution);
  };
}

export function startGatewayServer(rootDir: string, port: number) {
  const server = http.createServer(createGatewayHandler(rootDir));
  server.listen(port);
  return server;
}

function main(): void {
  const rootDir = process.cwd();
  const port = Number(process.env.PORT ?? "3100");
  const server = startGatewayServer(rootDir, port);

  server.on("listening", () => {
    process.stdout.write(`${JSON.stringify({ service: moduleName, port }, null, 2)}\n`);
  });
}

const entryHref = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryHref !== null && import.meta.url === entryHref) {
  main();
}
