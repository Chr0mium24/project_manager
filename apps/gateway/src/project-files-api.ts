import {
  listProjectFiles,
  readProject,
  readProjectFile,
  writeProjectFile
} from "@project-manager/project-core";
import { type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";

interface FileQuery {
  path?: string;
}

interface FileWriteBody {
  path?: string;
  content?: string;
}

const fileWriteBodySchema = z.object({
  path: z.string().min(1),
  content: z.string()
}).strict();

function sendProjectFiles(rootDir: string, slug: string, reply: FastifyReply): boolean {
  const project = readProject(rootDir, slug);
  if (project === null) {
    void reply.code(404).send({
      error: "project-not-found",
      slug
    });
    return true;
  }

  void reply.code(200).send({
    slug,
    files: listProjectFiles(rootDir, slug) ?? []
  });
  return true;
}

function sendProjectFileContent(
  rootDir: string,
  slug: string,
  request: FastifyRequest<{ Querystring: FileQuery }>,
  reply: FastifyReply
): boolean {
  const relativePath = request.query.path;
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    void reply.code(400).send({
      error: "missing-project-file-path",
      slug
    });
    return true;
  }

  try {
    const content = readProjectFile(rootDir, slug, relativePath);
    if (content === null) {
      const project = readProject(rootDir, slug);
      if (project === null) {
        void reply.code(404).send({
          error: "project-not-found",
          slug
        });
        return true;
      }

      void reply.code(404).send({
        error: "project-file-not-found",
        slug,
        path: relativePath
      });
      return true;
    }

    void reply.code(200).send({
      slug,
      path: relativePath,
      content
    });
    return true;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    void reply.code(400).send({
      error: "invalid-project-file-path",
      slug,
      message: error.message
    });
    return true;
  }
}

function sendProjectFileWrite(
  rootDir: string,
  slug: string,
  request: FastifyRequest<{ Body: FileWriteBody }>,
  reply: FastifyReply
): boolean {
  const parsedBody = fileWriteBodySchema.safeParse(request.body);
  if (!parsedBody.success) {
    void reply.code(400).send({
      error: "invalid-project-file-write-body",
      slug
    });
    return true;
  }

  try {
    const writeResult = writeProjectFile(rootDir, slug, parsedBody.data.path, parsedBody.data.content);
    if (writeResult === null) {
      void reply.code(404).send({
        error: "project-not-found",
        slug
      });
      return true;
    }

    void reply.code(200).send({
      slug,
      path: writeResult.path,
      size: writeResult.size,
      updatedAt: writeResult.updatedAt
    });
    return true;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    void reply.code(400).send({
      error: "invalid-project-file-path",
      slug,
      message: error.message
    });
    return true;
  }
}

export function sendProjectFilesApi(
  rootDir: string,
  pathname: string,
  request: FastifyRequest<{ Querystring: FileQuery; Body: FileWriteBody }>,
  reply: FastifyReply
): boolean {
  const filesMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/files$/);
  if (filesMatch && request.method === "GET") {
    const slug = filesMatch[1] ?? "";
    return sendProjectFiles(rootDir, slug, reply);
  }

  const fileMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/file$/);
  if (!fileMatch) {
    return false;
  }

  const slug = fileMatch[1] ?? "";
  if (request.method === "GET") {
    return sendProjectFileContent(rootDir, slug, request, reply);
  }

  if (request.method === "PUT") {
    return sendProjectFileWrite(rootDir, slug, request, reply);
  }

  return false;
}
