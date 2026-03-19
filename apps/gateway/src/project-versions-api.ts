import {
  createProjectVersion,
  listProjectVersions,
  readProjectVersion,
  restoreProjectVersion,
  type ProjectVersionRecord
} from "@project-manager/git-core";
import { type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";

interface VersionCreateBody {
  message?: string;
}

interface ProjectVersionListPayload {
  versions: ProjectVersionRecord[];
}

interface ProjectVersionReadPayload {
  version: ProjectVersionRecord;
}

interface ProjectVersionCreatePayload {
  version: ProjectVersionRecord;
}

interface ProjectVersionRestorePayload {
  restoredVersion: ProjectVersionRecord;
}

const versionCreateBodySchema = z.object({
  message: z.string().min(1)
}).strict();

function sendProjectVersionList(rootDir: string, slug: string, reply: FastifyReply): boolean {
  const payload: ProjectVersionListPayload = {
    versions: listProjectVersions(rootDir, slug)
  };
  void reply.code(200).send(payload);
  return true;
}

function sendProjectVersionRead(
  rootDir: string,
  slug: string,
  versionId: string,
  reply: FastifyReply
): boolean {
  const version = readProjectVersion(rootDir, slug, versionId);
  if (version === null) {
    void reply.code(404).send({
      error: "project-version-not-found",
      slug,
      versionId
    });
    return true;
  }

  const payload: ProjectVersionReadPayload = { version };
  void reply.code(200).send(payload);
  return true;
}

function sendProjectVersionCreate(
  rootDir: string,
  slug: string,
  request: FastifyRequest<{ Body: VersionCreateBody }>,
  reply: FastifyReply
): boolean {
  const parsedBody = versionCreateBodySchema.safeParse(request.body);
  if (!parsedBody.success) {
    void reply.code(400).send({
      error: "invalid-project-version-body",
      slug
    });
    return true;
  }

  const version = createProjectVersion(rootDir, slug, parsedBody.data.message);
  if (version === null) {
    void reply.code(404).send({
      error: "project-not-found",
      slug
    });
    return true;
  }

  const payload: ProjectVersionCreatePayload = { version };
  void reply.code(201).send(payload);
  return true;
}

function sendProjectVersionRestore(
  rootDir: string,
  slug: string,
  versionId: string,
  reply: FastifyReply
): boolean {
  const restoredVersion = restoreProjectVersion(rootDir, slug, versionId);
  if (restoredVersion === null) {
    void reply.code(404).send({
      error: "project-version-not-found",
      slug,
      versionId
    });
    return true;
  }

  const payload: ProjectVersionRestorePayload = { restoredVersion };
  void reply.code(200).send(payload);
  return true;
}

function sendVersionRestoreRoute(
  rootDir: string,
  pathname: string,
  method: string,
  reply: FastifyReply
): boolean {
  const restoreMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/versions\/([^/]+)\/restore$/);
  if (!restoreMatch || method !== "POST") {
    return false;
  }

  return sendProjectVersionRestore(rootDir, restoreMatch[1] ?? "", restoreMatch[2] ?? "", reply);
}

function sendVersionReadRoute(
  rootDir: string,
  pathname: string,
  method: string,
  reply: FastifyReply
): boolean {
  const versionMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/versions\/([^/]+)$/);
  if (!versionMatch || method !== "GET") {
    return false;
  }

  return sendProjectVersionRead(rootDir, versionMatch[1] ?? "", versionMatch[2] ?? "", reply);
}

function sendVersionCollectionRoute(
  rootDir: string,
  pathname: string,
  request: FastifyRequest<{ Body: VersionCreateBody }>,
  reply: FastifyReply
): boolean {
  const versionsMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/versions$/);
  if (!versionsMatch) {
    return false;
  }

  const slug = versionsMatch[1] ?? "";
  switch (request.method) {
    case "GET":
      return sendProjectVersionList(rootDir, slug, reply);
    case "POST":
      return sendProjectVersionCreate(rootDir, slug, request, reply);
    default:
      return false;
  }
}

export function sendProjectVersionsApi(
  rootDir: string,
  pathname: string,
  request: FastifyRequest<{ Body: VersionCreateBody }>,
  reply: FastifyReply
): boolean {
  if (sendVersionRestoreRoute(rootDir, pathname, request.method, reply)) {
    return true;
  }

  if (sendVersionReadRoute(rootDir, pathname, request.method, reply)) {
    return true;
  }

  return sendVersionCollectionRoute(rootDir, pathname, request, reply);
}
