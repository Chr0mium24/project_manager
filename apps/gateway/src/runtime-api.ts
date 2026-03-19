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
  query: Record<string, string | string[]>;
  body: unknown;
}

export interface DynamicRuntimeResponse {
  statusCode: number;
  body: unknown;
}

export interface DynamicRuntimeRequestOptions {
  pathname: string;
  method: string;
  query?: Record<string, string | string[]>;
  body?: unknown;
}

type JsonPrimitive = boolean | null | number | string;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

interface DynamicRuntimeModule {
  handler: (context: DynamicRuntimeRequestContext) => JsonValue | Promise<JsonValue>;
}

interface ErrorWithMessage {
  message: string;
}

interface ResolvedDynamicRuntimeTarget {
  entryPath: string;
  route: string;
  slug: string;
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

function hasErrorMessage(errorValue: unknown): errorValue is ErrorWithMessage {
  if (typeof errorValue !== "object" || errorValue === null) {
    return false;
  }

  const candidate = errorValue as { message?: unknown };
  return typeof candidate.message === "string";
}

export function normalizeRuntimeQuery(queryValue: unknown): Record<string, string | string[]> {
  if (typeof queryValue !== "object" || queryValue === null) {
    return {};
  }

  const normalizedQuery: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(queryValue)) {
    if (typeof value === "string") {
      normalizedQuery[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      const stringValues = value.filter((item): item is string => typeof item === "string");
      normalizedQuery[key] = stringValues;
    }
  }

  return normalizedQuery;
}

async function importDynamicRuntimeModule(entryPath: string): Promise<unknown> {
  const modifiedAt = fs.statSync(entryPath).mtimeMs;
  const entryUrl = new URL(pathToFileURL(entryPath).href);
  entryUrl.searchParams.set("mtime", String(modifiedAt));
  return import(entryUrl.href);
}

function resolveDynamicRuntimeTarget(
  rootDir: string,
  slug: string
): DynamicRuntimeResponse | ResolvedDynamicRuntimeTarget {
  const project = readProject(rootDir, slug);
  const entryPath = getProjectEntryPath(rootDir, slug);

  if (project === null || project.runtime !== "dynamic" || entryPath === null || !fs.existsSync(entryPath)) {
    return {
      statusCode: 404,
      body: {
        error: "dynamic-runtime-not-found",
        slug
      }
    };
  }

  return {
    slug: project.slug,
    route: project.route,
    entryPath
  };
}

async function invokeDynamicRuntimeHandler(
  moduleValue: DynamicRuntimeModule,
  target: ResolvedDynamicRuntimeTarget,
  options: DynamicRuntimeRequestOptions,
  runtimePath: string
): Promise<DynamicRuntimeResponse> {
  try {
    const body = await moduleValue.handler({
      slug: target.slug,
      pathname: options.pathname,
      runtimePath,
      method: options.method,
      route: target.route,
      query: options.query ?? {},
      body: options.body ?? null
    });

    return {
      statusCode: 200,
      body
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: {
        error: "dynamic-handler-failed",
        slug: target.slug,
        message: hasErrorMessage(error) ? error.message : "unknown runtime error"
      }
    };
  }
}

export async function executeDynamicRuntimeRequest(
  rootDir: string,
  options: DynamicRuntimeRequestOptions
): Promise<DynamicRuntimeResponse | null> {
  const runtimeRequest = parseRuntimeRequest(options.pathname);
  if (runtimeRequest === null) {
    return null;
  }

  const target = resolveDynamicRuntimeTarget(rootDir, runtimeRequest.slug);
  if ("statusCode" in target) {
    return target;
  }

  const moduleValue = await importDynamicRuntimeModule(target.entryPath);
  if (!hasDynamicHandlerExport(moduleValue)) {
    return {
      statusCode: 500,
      body: {
        error: "invalid-dynamic-handler",
        slug: target.slug
      }
    };
  }

  return invokeDynamicRuntimeHandler(moduleValue, target, options, runtimeRequest.runtimePath);
}
