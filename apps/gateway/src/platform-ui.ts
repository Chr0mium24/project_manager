import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type FastifyReply } from "fastify";

const PROJECT_MANAGER_UI_SOURCE_HEADER = "x-project-manager-ui-source";
const GATEWAY_DIST_UI_SOURCE = "gateway-dist";
const GATEWAY_DIST_ASSET_SOURCE = "gateway-dist-asset";
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(CURRENT_DIR, "..", "..", "..");
const WEB_DIST_ROOT = path.join(REPO_ROOT, "apps", "web", "dist");
const INDEX_HTML_PATH = path.join(WEB_DIST_ROOT, "index.html");

function contentTypeFor(filePath: string): string {
  const extension = path.extname(filePath);
  if (extension === ".html") {
    return "text/html; charset=utf-8";
  }
  if (extension === ".js") {
    return "text/javascript; charset=utf-8";
  }
  if (extension === ".css") {
    return "text/css; charset=utf-8";
  }
  if (extension === ".json") {
    return "application/json; charset=utf-8";
  }
  if (extension === ".svg") {
    return "image/svg+xml";
  }
  return "application/octet-stream";
}

function sendDistFile(
  filePath: string,
  reply: FastifyReply,
  headers: Record<string, string> = {}
): boolean {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return false;
  }

  let response = reply.header("content-type", contentTypeFor(filePath));
  for (const [headerName, headerValue] of Object.entries(headers)) {
    response = response.header(headerName, headerValue);
  }

  void response.code(200).send(fs.readFileSync(filePath));
  return true;
}

function sendPlatformAsset(pathname: string, reply: FastifyReply): boolean {
  if (!pathname.startsWith("/assets/")) {
    return false;
  }

  const relativePath = pathname.slice(1);
  const resolvedPath = path.resolve(WEB_DIST_ROOT, relativePath);
  if (!resolvedPath.startsWith(path.join(WEB_DIST_ROOT, "assets"))) {
    void reply.code(404).send({ error: "platform-asset-not-found", pathname });
    return true;
  }

  if (
    sendDistFile(resolvedPath, reply, {
      [PROJECT_MANAGER_UI_SOURCE_HEADER]: GATEWAY_DIST_ASSET_SOURCE
    })
  ) {
    return true;
  }

  void reply.code(404).send({ error: "platform-asset-not-found", pathname });
  return true;
}

function sendPlatformDocument(pathname: string, reply: FastifyReply): boolean {
  if (pathname !== "/" && pathname !== "/projects" && !pathname.startsWith("/projects/")) {
    return false;
  }

  if (
    sendDistFile(INDEX_HTML_PATH, reply, {
      "cache-control": "no-store",
      [PROJECT_MANAGER_UI_SOURCE_HEADER]: GATEWAY_DIST_UI_SOURCE
    })
  ) {
    return true;
  }

  void reply.code(503).send({
    error: "platform-ui-build-missing",
    message: "Run `corepack pnpm build:web` to generate apps/web/dist."
  });
  return true;
}

export function sendPlatformUi(pathname: string, reply: FastifyReply): boolean {
  return sendPlatformAsset(pathname, reply) || sendPlatformDocument(pathname, reply);
}
