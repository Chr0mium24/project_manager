import {
  createProjectVersion,
  listProjectVersions,
  readProjectVersion,
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

export function sendProjectVersionsApi(
  rootDir: string,
  pathname: string,
  request: FastifyRequest<{ Body: VersionCreateBody }>,
  reply: FastifyReply
): boolean {
  const versionMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/versions\/([^/]+)$/);
  if (versionMatch) {
    if (request.method !== "GET") {
      return false;
    }

    return sendProjectVersionRead(rootDir, versionMatch[1] ?? "", versionMatch[2] ?? "", reply);
  }

  const versionsMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/versions$/);
  if (!versionsMatch) {
    return false;
  }

  const slug = versionsMatch[1] ?? "";
  if (request.method === "GET") {
    return sendProjectVersionList(rootDir, slug, reply);
  }

  if (request.method === "POST") {
    return sendProjectVersionCreate(rootDir, slug, request, reply);
  }

  return false;
}
