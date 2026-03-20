import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import { createAiTaskQueue, type CodexExecutor } from "@project-manager/ai-core";
import { sendAiTaskApi, type GatewayAiOptions } from "./ai-api.ts";
import {
  sendAdminAuthRejection,
  resolveGatewayAuthConfig,
  type GatewayAuthConfig,
  type GatewayAuthOptions
} from "./auth.ts";
import { executeDynamicRuntimeRequest, normalizeRuntimeQuery } from "./runtime-api.ts";
import { sendManagedTaskApi } from "./managed-task-api.ts";
import { sendManagedTaskQueryApi } from "./managed-task-query-api.ts";
import { sendProjectApi } from "./project-api.ts";
import { sendProjectFilesApi } from "./project-files-api.ts";
import { sendProjectVersionsApi } from "./project-versions-api.ts";
import {
  sendDynamicProject,
  sendStaticProject
} from "./project-runtime-routes.ts";
import {
  sendPublishApi,
  sendPublishMutationApi
} from "./publish-api.ts";
export type RouteTargetKind = "internal-handler" | "static-build" | "dynamic-handler";
export interface RouteRecord {
  routePrefix: string;
  targetKind: RouteTargetKind;
  targetRef: string;
  updatedAt?: string | undefined;
}
export interface RouteRegistry {
  version: number;
  updatedAt: string | null;
  routes: RouteRecord[];
}
export interface GatewayResolution {
  kind: "healthz" | "platform-ui" | "control-api" | "runtime-api" | "managed-route" | "not-found";
  pathname: string;
  routePrefix: string | null;
  targetKind: RouteTargetKind | null;
  targetRef: string | null;
}
interface ControlApiRequest {
  rootDir: string;
  pathname: string;
  request: FastifyRequest;
}
interface GatewayRequestContext {
  authConfig: GatewayAuthConfig;
  rootDir: string;
  aiOptions: GatewayAiOptions;
}
interface ResolutionRouteRegistration {
  method: "get" | "post" | "put" | "delete" | "all";
  routePath: string;
}
export interface GatewayAppOptions extends GatewayAuthOptions {
  aiExecutor?: CodexExecutor;
}

const routeRecordSchema = z.object({
  routePrefix: z.string().min(1),
  targetKind: z.enum(["internal-handler", "static-build", "dynamic-handler"]),
  targetRef: z.string().min(1),
  updatedAt: z.string().optional()
});

const routeRegistrySchema = z.object({
  version: z.number().int().positive(),
  updatedAt: z.string().nullable(),
  routes: z.array(routeRecordSchema)
});

const portSchema = z.coerce.number().int().min(1).max(65535);

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

  const rawValue: unknown = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  return routeRegistrySchema.parse(rawValue);
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

function isPlatformUiPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/projects"
    || pathname.startsWith("/projects/") || pathname.startsWith("/assets/");
}

function isControlApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/projects") || pathname.startsWith("/api/ai") || pathname.startsWith("/api/publish");
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

  if (isPlatformUiPath(pathname)) {
    return {
      kind: "platform-ui",
      pathname,
      routePrefix: null,
      targetKind: null,
      targetRef: null
    };
  }

  if (isControlApiPath(pathname)) {
    return {
      kind: "control-api",
      pathname,
      routePrefix: null,
      targetKind: null,
      targetRef: null
    };
  }

  if (pathname.startsWith("/api/runtime/")) {
    return {
      kind: "runtime-api",
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

function resolveRequestPath(request: FastifyRequest): string {
  return request.url.split("?")[0] ?? "/";
}

function sendControlApiRoutes(
  controlRequest: ControlApiRequest,
  reply: FastifyReply,
  context: GatewayRequestContext
): boolean {
  const { rootDir, pathname, request } = controlRequest;

  if (sendProjectFilesApi(rootDir, pathname, request, reply)) {
    return true;
  }

  if (sendProjectVersionsApi(rootDir, pathname, request, reply)) {
    return true;
  }

  if (sendManagedTaskQueryApi(rootDir, pathname, request.method, reply)) {
    return true;
  }

  if (sendManagedTaskApi(rootDir, pathname, request, reply)) {
    return true;
  }

  if (sendPublishRoutes(rootDir, pathname, request.method, reply)) {
    return true;
  }

  if (sendAiTaskApi(context, pathname, request, reply)) {
    return true;
  }

  return sendProjectApi(rootDir, pathname, request.method, reply);
}

function sendControlApi(
  context: GatewayRequestContext,
  controlRequest: ControlApiRequest,
  reply: FastifyReply
): boolean {
  const { rootDir, pathname, request } = controlRequest;
  if (!pathname.startsWith("/api/")) {
    return false;
  }

  if (sendAdminAuthRejection(context.authConfig, pathname, request, reply)) {
    return true;
  }

  if (sendControlApiRoutes(controlRequest, reply, context)) {
    return true;
  }

  const resolution = resolveGatewayRequest(rootDir, pathname);
  if (resolution.kind !== "control-api") {
    return false;
  }

  const registry = readRouteRegistry(rootDir);
  void reply.code(200).send({
    ...resolution,
    registryVersion: registry.version,
    routeCount: registry.routes.length
  });
  return true;
}

function sendPublishRoutes(
  rootDir: string,
  pathname: string,
  method: string,
  reply: FastifyReply
): boolean {
  if (method === "GET") {
    return sendPublishApi(rootDir, pathname, reply);
  }

  if (method === "POST") {
    return sendPublishMutationApi(rootDir, pathname, reply);
  }

  return false;
}

async function sendRuntimeApi(
  rootDir: string,
  pathname: string,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<boolean> {
  if (!pathname.startsWith("/api/runtime/")) {
    return false;
  }

  const response = await executeDynamicRuntimeRequest(rootDir, {
    pathname,
    method: request.method,
    query: normalizeRuntimeQuery(request.query),
    body: request.body
  });
  if (response === null) {
    return false;
  }

  void reply.code(response.statusCode).send(response.body);
  return true;
}
async function sendResolution(
  context: GatewayRequestContext,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { rootDir } = context;
  const pathname = resolveRequestPath(request);
  if (sendStaticProject(rootDir, pathname, reply)) {
    return;
  }
  if (sendDynamicProject(rootDir, pathname, reply)) {
    return;
  }
  if (await sendRuntimeApi(rootDir, pathname, request, reply)) {
    return;
  }
  if (sendControlApi(context, { rootDir, pathname, request }, reply)) {
    return;
  }

  const resolution = resolveGatewayRequest(rootDir, pathname);
  if (resolution.kind === "healthz") {
    void reply.code(200).send({ ok: true, service: moduleName });
    return;
  }
  if (resolution.kind === "not-found") {
    void reply.code(404).send(resolution);
    return;
  }
  void reply.code(200).send(resolution);
}

function registerResolutionRoute(
  app: FastifyInstance,
  registration: ResolutionRouteRegistration,
  context: GatewayRequestContext
): void {
  app[registration.method](registration.routePath, (request, reply) => {
    return sendResolution(context, request, reply);
  });
}

export function createGatewayApp(rootDir: string, options?: GatewayAppOptions): FastifyInstance {
  const app = Fastify({ logger: false });
  const context: GatewayRequestContext = {
    authConfig: resolveGatewayAuthConfig(options),
    rootDir,
    aiOptions: {
      executor: options?.aiExecutor,
      queue: createAiTaskQueue(rootDir, {
        executor: options?.aiExecutor
      })
    }
  };
  const routes: ResolutionRouteRegistration[] = [
    { method: "get", routePath: "/healthz" },
    { method: "get", routePath: "/" },
    { method: "get", routePath: "/projects/*" },
    { method: "get", routePath: "/assets/*" },
    { method: "get", routePath: "/api/projects" },
    { method: "get", routePath: "/api/projects/*" },
    { method: "post", routePath: "/api/projects/*" },
    { method: "put", routePath: "/api/projects/*" },
    { method: "delete", routePath: "/api/projects/*" },
    { method: "get", routePath: "/api/ai/*" },
    { method: "post", routePath: "/api/ai/*" },
    { method: "delete", routePath: "/api/ai/*" },
    { method: "get", routePath: "/api/publish/*" },
    { method: "post", routePath: "/api/publish/*" },
    { method: "delete", routePath: "/api/publish/*" },
    { method: "get", routePath: "/p/*" },
    { method: "get", routePath: "/app/*" },
    { method: "all", routePath: "/api/runtime/*" }
  ];

  for (const route of routes) {
    registerResolutionRoute(app, route, context);
  }

  app.setNotFoundHandler((request, reply) => {
    return sendResolution(context, request, reply);
  });

  return app;
}

export async function startGatewayServer(rootDir: string, port: number): Promise<FastifyInstance> {
  const app = createGatewayApp(rootDir);
  await app.listen({ host: "127.0.0.1", port });
  return app;
}

function resolvePortFromEnv(): number {
  return portSchema.parse(process.env.PORT ?? "3100");
}

async function main(): Promise<void> {
  const rootDir = process.cwd();
  const port = resolvePortFromEnv();
  const app = await startGatewayServer(rootDir, port);

  app.log.info({ service: moduleName, port }, "gateway listening");
  process.stdout.write(`${JSON.stringify({ service: moduleName, port }, null, 2)}\n`);
}

const entryHref = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryHref !== null && import.meta.url === entryHref) {
  await main();
}
