import fs from "node:fs";
import path from "node:path";
import {
  readProject,
  readProjectEntry
} from "@project-manager/project-core";
import {
  readDynamicPublishRecord,
  type DynamicPublishResult,
  readPublishedStaticFile,
  readPublishedStaticEntry
} from "@project-manager/publish-core";
import { type FastifyReply } from "fastify";

function buildDynamicProjectPayload(
  project: NonNullable<ReturnType<typeof readProject>>,
  published: DynamicPublishResult | null
): Record<string, string | null> {
  return {
    slug: project.slug,
    runtime: project.runtime,
    route: published?.route ?? project.route,
    entry: published?.entryPath ?? project.entry,
    framework: project.framework,
    publishedAt: published?.publishedAt ?? null
  };
}

const staticAssetContentTypes = new Map<string, string>([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".jsx", "text/babel; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"]
]);

function inferStaticAssetContentType(relativePath: string): string {
  return staticAssetContentTypes.get(path.extname(relativePath).toLowerCase()) ?? "application/octet-stream";
}

function normalizeStaticAssetPath(rawAssetPath: string): string | null {
  const decodedAssetPath = decodeURIComponent(rawAssetPath).replace(/^\/+/, "");
  if (decodedAssetPath.length === 0) {
    return null;
  }

  const normalizedPath = path.posix.normalize(decodedAssetPath);
  if (normalizedPath === "." || normalizedPath.startsWith("../") || normalizedPath.includes("/../")) {
    return null;
  }

  return normalizedPath;
}

function readSourceStaticAsset(
  rootDir: string,
  slug: string,
  entryPath: string,
  relativePath: string
): Buffer | null {
  const sourceAssetPath = path.join(
    rootDir,
    "content-repo",
    "projects",
    slug,
    path.dirname(entryPath),
    relativePath
  );
  if (!fs.existsSync(sourceAssetPath) || !fs.statSync(sourceAssetPath).isFile()) {
    return null;
  }

  return fs.readFileSync(sourceAssetPath);
}

function sendStaticProjectNotFound(reply: FastifyReply, slug: string): true {
  void reply.code(404).send({
    error: "static-project-not-found",
    slug
  });
  return true;
}

function sendStaticAssetNotFound(reply: FastifyReply, slug: string, assetPath: string): true {
  void reply.code(404).send({
    error: "static-project-asset-not-found",
    slug,
    path: assetPath
  });
  return true;
}

interface StaticAssetRequest {
  entryPath: string;
  requestedAssetPath: string;
  rootDir: string;
  slug: string;
}

function sendStaticAsset(request: StaticAssetRequest, reply: FastifyReply): true {
  const normalizedAssetPath = normalizeStaticAssetPath(request.requestedAssetPath);
  const assetContent = normalizedAssetPath === null
    ? null
    : readPublishedStaticFile(request.rootDir, request.slug, normalizedAssetPath)
      ?? readSourceStaticAsset(request.rootDir, request.slug, request.entryPath, normalizedAssetPath);
  if (assetContent === null) {
    return sendStaticAssetNotFound(reply, request.slug, request.requestedAssetPath);
  }

  void reply
    .code(200)
    .header("content-type", inferStaticAssetContentType(normalizedAssetPath))
    .send(assetContent);
  return true;
}

function sendStaticEntry(rootDir: string, slug: string, reply: FastifyReply): true {
  const entryContent = readPublishedStaticEntry(rootDir, slug) ?? readProjectEntry(rootDir, slug);
  if (entryContent === null) {
    return sendStaticProjectNotFound(reply, slug);
  }

  void reply
    .code(200)
    .header("content-type", "text/html; charset=utf-8")
    .send(entryContent);
  return true;
}

export function sendStaticProject(rootDir: string, pathname: string, reply: FastifyReply): boolean {
  const staticProjectMatch = pathname.match(/^\/p\/([a-z0-9-]+)(?:\/(.*))?$/);
  if (!staticProjectMatch) {
    return false;
  }

  const slug = staticProjectMatch[1] ?? "";
  const requestedAssetPath = staticProjectMatch[2] ?? null;
  const project = readProject(rootDir, slug);
  if (project === null || project.runtime !== "static") {
    return sendStaticProjectNotFound(reply, slug);
  }

  if (requestedAssetPath !== null && requestedAssetPath.length > 0) {
    return sendStaticAsset({
      entryPath: project.entry,
      requestedAssetPath,
      rootDir,
      slug
    }, reply);
  }

  return sendStaticEntry(rootDir, slug, reply);
}

export function sendDynamicProject(rootDir: string, pathname: string, reply: FastifyReply): boolean {
  const dynamicProjectMatch = pathname.match(/^\/app\/([a-z0-9-]+)(?:\/.*)?$/);
  if (!dynamicProjectMatch) {
    return false;
  }

  const slug = dynamicProjectMatch[1] ?? "";
  const project = readProject(rootDir, slug);
  const published = readDynamicPublishRecord(rootDir, slug);
  if (project === null || project.runtime !== "dynamic") {
    void reply.code(404).send({
      error: "dynamic-project-not-found",
      slug
    });
    return true;
  }

  void reply.code(200).send(buildDynamicProjectPayload(project, published));
  return true;
}
