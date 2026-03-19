import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import { listProjects, readProject, readProjectEntry } from "./content-repo.ts";

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

  const rawValue = JSON.parse(fs.readFileSync(registryPath, "utf8"));
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

function resolveRequestPath(request: FastifyRequest): string {
  return request.url.split("?")[0] ?? "/";
}

function sendResolution(
  rootDir: string,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const pathname = resolveRequestPath(request);
  const staticProjectMatch = pathname.match(/^\/p\/([a-z0-9-]+)(?:\/.*)?$/);
  if (staticProjectMatch) {
    const project = readProject(rootDir, staticProjectMatch[1] ?? "");
    const entryContent = readProjectEntry(rootDir, staticProjectMatch[1] ?? "");

    if (project === null || project.runtime !== "static" || entryContent === null) {
      void reply.code(404).send({
        error: "static-project-not-found",
        slug: staticProjectMatch[1]
      });
      return;
    }

    void reply
      .code(200)
      .header("content-type", "text/html; charset=utf-8")
      .send(entryContent);
    return;
  }

  const dynamicProjectMatch = pathname.match(/^\/app\/([a-z0-9-]+)(?:\/.*)?$/);
  if (dynamicProjectMatch) {
    const project = readProject(rootDir, dynamicProjectMatch[1] ?? "");
    if (project === null || project.runtime !== "dynamic") {
      void reply.code(404).send({
        error: "dynamic-project-not-found",
        slug: dynamicProjectMatch[1]
      });
      return;
    }

    void reply.code(200).send({
      slug: project.slug,
      runtime: project.runtime,
      route: project.route,
      entry: project.entry,
      framework: project.framework
    });
    return;
  }

  const resolution = resolveGatewayRequest(rootDir, pathname);

  if (resolution.kind === "not-found") {
    void reply.code(404).send(resolution);
    return;
  }

  if (resolution.kind === "healthz") {
    void reply.code(200).send({ ok: true, service: moduleName });
    return;
  }

  if (resolution.kind === "control-api") {
    if (pathname === "/api/projects") {
      void reply.code(200).send({
        projects: listProjects(rootDir)
      });
      return;
    }

    const projectSlugMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)$/);
    if (projectSlugMatch) {
      const project = readProject(rootDir, projectSlugMatch[1] ?? "");
      if (project === null) {
        void reply.code(404).send({
          error: "project-not-found",
          slug: projectSlugMatch[1]
        });
        return;
      }

      void reply.code(200).send(project);
      return;
    }

    const registry = readRouteRegistry(rootDir);
    void reply.code(200).send({
      ...resolution,
      registryVersion: registry.version,
      routeCount: registry.routes.length
    });
    return;
  }

  void reply.code(200).send(resolution);
}

export function createGatewayApp(rootDir: string): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get("/healthz", (request, reply) => {
    sendResolution(rootDir, request, reply);
  });

  app.get("/", (request, reply) => {
    sendResolution(rootDir, request, reply);
  });

  app.get("/projects/*", (request, reply) => {
    sendResolution(rootDir, request, reply);
  });

  app.get("/assets/*", (request, reply) => {
    sendResolution(rootDir, request, reply);
  });

  app.get("/api/projects", (request, reply) => {
    sendResolution(rootDir, request, reply);
  });

  app.get("/api/projects/*", (request, reply) => {
    sendResolution(rootDir, request, reply);
  });

  app.get("/api/ai/*", (request, reply) => {
    sendResolution(rootDir, request, reply);
  });

  app.get("/api/publish/*", (request, reply) => {
    sendResolution(rootDir, request, reply);
  });

  app.get("/p/*", (request, reply) => {
    sendResolution(rootDir, request, reply);
  });

  app.get("/app/*", (request, reply) => {
    sendResolution(rootDir, request, reply);
  });

  app.get("/api/runtime/*", (request, reply) => {
    sendResolution(rootDir, request, reply);
  });

  app.setNotFoundHandler((request, reply) => {
    sendResolution(rootDir, request, reply);
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
