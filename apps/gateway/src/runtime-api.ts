import fs from "node:fs";
import { pathToFileURL } from "node:url";
import {
  getProjectEntryPath,
  readProject
} from "@project-manager/project-core";

export interface DynamicRuntimeRequestContext {
  slug: string;
  pathname: string;
  runtimePath: string;
  method: string;
  route: string;
}

export interface DynamicRuntimeResponse {
  statusCode: number;
  body: unknown;
}

type JsonPrimitive = boolean | null | number | string;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

interface DynamicRuntimeModule {
  handler: (context: DynamicRuntimeRequestContext) => JsonValue | Promise<JsonValue>;
}

function parseRuntimeRequest(pathname: string): {
  slug: string;
  runtimePath: string;
} | null {
  const matchedPath = pathname.match(/^\/api\/runtime\/([a-z0-9-]+)(\/.*)?$/);
  if (!matchedPath) {
    return null;
  }

  const slug = matchedPath[1] ?? "";
  const runtimePath = matchedPath[2] ?? "/";
  return { slug, runtimePath };
}

function hasDynamicHandlerExport(moduleValue: unknown): moduleValue is DynamicRuntimeModule {
  if (typeof moduleValue !== "object" || moduleValue === null) {
    return false;
  }

  const candidate = moduleValue as { handler?: unknown };
  return typeof candidate.handler === "function";
}

async function importDynamicRuntimeModule(entryPath: string): Promise<unknown> {
  const modifiedAt = fs.statSync(entryPath).mtimeMs;
  const entryUrl = new URL(pathToFileURL(entryPath).href);
  entryUrl.searchParams.set("mtime", String(modifiedAt));
  return import(entryUrl.href);
}

export async function executeDynamicRuntimeRequest(
  rootDir: string,
  pathname: string,
  method: string
): Promise<DynamicRuntimeResponse | null> {
  const runtimeRequest = parseRuntimeRequest(pathname);
  if (runtimeRequest === null) {
    return null;
  }

  const project = readProject(rootDir, runtimeRequest.slug);
  const entryPath = getProjectEntryPath(rootDir, runtimeRequest.slug);

  if (project === null || project.runtime !== "dynamic" || entryPath === null || !fs.existsSync(entryPath)) {
    return {
      statusCode: 404,
      body: {
        error: "dynamic-runtime-not-found",
        slug: runtimeRequest.slug
      }
    };
  }

  const moduleValue = await importDynamicRuntimeModule(entryPath);
  if (!hasDynamicHandlerExport(moduleValue)) {
    return {
      statusCode: 500,
      body: {
        error: "invalid-dynamic-handler",
        slug: runtimeRequest.slug
      }
    };
  }

  const body = await moduleValue.handler({
    slug: project.slug,
    pathname,
    runtimePath: runtimeRequest.runtimePath,
    method,
    route: project.route
  });

  return {
    statusCode: 200,
    body
  };
}
