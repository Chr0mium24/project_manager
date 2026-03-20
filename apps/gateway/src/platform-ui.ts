import { type FastifyReply } from "fastify";
import {
  readPlatformAsset,
  renderPlatformDocument
} from "../../web/src/index.ts";

function sendPlatformAsset(pathname: string, reply: FastifyReply): boolean {
  const asset = readPlatformAsset(pathname);
  if (asset === null) {
    return false;
  }

  void reply
    .header("content-type", asset.contentType)
    .code(200)
    .send(asset.body);
  return true;
}

function sendPlatformDocument(pathname: string, reply: FastifyReply): boolean {
  if (pathname !== "/" && pathname !== "/projects" && !pathname.startsWith("/projects/")) {
    return false;
  }

  void reply
    .header("content-type", "text/html; charset=utf-8")
    .code(200)
    .send(renderPlatformDocument({ pathname }));
  return true;
}

export function sendPlatformUi(pathname: string, reply: FastifyReply): boolean {
  return sendPlatformAsset(pathname, reply)
    || sendPlatformDocument(pathname, reply);
}
