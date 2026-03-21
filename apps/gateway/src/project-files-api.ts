import {
  listProjectFiles,
  readProjectFileTree,
  readProject,
  readProjectFile,
  writeProjectFile
} from "@project-manager/project-core";
import { type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import {
  runProjectMutationChecks,
  type ProjectMutationChecksResult,
  type ProjectMutationChecksRunner
} from "./project-mutation-checks.ts";
import { deleteProjectFileFromRepo } from "./project-fs-mutations.ts";

interface FileQuery {
  path?: string;
  runChecks?: string;
}

interface FileWriteBody {
  path?: string;
  content?: string;
  runChecks?: boolean;
}

const fileWriteBodySchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  runChecks: z.boolean().optional()
}).strict();

export interface ProjectFilesApiContext {
  rootDir: string;
  mutationChecksRunner?: ProjectMutationChecksRunner;
}

function shouldRunChecks(value: string | undefined): boolean {
  return value === "true";
}

async function maybeRunChecks(
  context: ProjectFilesApiContext,
  requested: boolean | undefined
): Promise<ProjectMutationChecksResult | null> {
  if (!requested) {
    return null;
  }

  const runner = context.mutationChecksRunner ?? runProjectMutationChecks;
  return await runner(context.rootDir);
}

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

function sendProjectFileTree(rootDir: string, slug: string, reply: FastifyReply): boolean {
  const tree = readProjectFileTree(rootDir, slug);
  if (tree === null) {
    void reply.code(404).send({
      error: "project-not-found",
      slug
    });
    return true;
  }

  void reply.code(200).send({
    slug,
    tree
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

async function sendProjectFileWrite(
  context: ProjectFilesApiContext,
  slug: string,
  request: FastifyRequest<{ Body: FileWriteBody }>,
  reply: FastifyReply
): Promise<boolean> {
  const parsedBody = fileWriteBodySchema.safeParse(request.body);
  if (!parsedBody.success) {
    void reply.code(400).send({
      error: "invalid-project-file-write-body",
      slug
    });
    return true;
  }

  try {
    const writeResult = writeProjectFile(context.rootDir, slug, parsedBody.data.path, parsedBody.data.content);
    if (writeResult === null) {
      void reply.code(404).send({
        error: "project-not-found",
        slug
      });
      return true;
    }

    const checks = await maybeRunChecks(context, parsedBody.data.runChecks);
    void reply.code(200).send({
      slug,
      path: writeResult.path,
      size: writeResult.size,
      updatedAt: writeResult.updatedAt,
      checks
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

async function sendProjectFileDelete(
  context: ProjectFilesApiContext,
  slug: string,
  request: FastifyRequest<{ Querystring: FileQuery }>,
  reply: FastifyReply
): Promise<boolean> {
  const relativePath = request.query.path;
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    void reply.code(400).send({
      error: "missing-project-file-path",
      slug
    });
    return true;
  }

  try {
    const deleteResult = deleteProjectFileFromRepo(context.rootDir, slug, relativePath);
    if (deleteResult === null) {
      const project = readProject(context.rootDir, slug);
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

    const checks = await maybeRunChecks(context, shouldRunChecks(request.query.runChecks));
    void reply.code(200).send({
      slug,
      path: deleteResult.path,
      updatedAt: deleteResult.updatedAt,
      checks
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
  context: ProjectFilesApiContext,
  pathname: string,
  request: FastifyRequest<{ Querystring: FileQuery; Body: FileWriteBody }>,
  reply: FastifyReply
): boolean {
  const treeMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/file-tree$/);
  if (treeMatch && request.method === "GET") {
    const slug = treeMatch[1] ?? "";
    return sendProjectFileTree(context.rootDir, slug, reply);
  }

  const filesMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/files$/);
  if (filesMatch && request.method === "GET") {
    const slug = filesMatch[1] ?? "";
    return sendProjectFiles(context.rootDir, slug, reply);
  }

  return false;
}

export async function sendSingleProjectFileApi(
  context: ProjectFilesApiContext,
  pathname: string,
  request: FastifyRequest<{ Querystring: FileQuery; Body: FileWriteBody }>,
  reply: FastifyReply
): Promise<boolean> {
  const fileMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/file$/);
  if (!fileMatch) {
    return false;
  }

  const slug = fileMatch[1] ?? "";
  if (request.method === "GET") {
    return sendProjectFileContent(context.rootDir, slug, request, reply);
  }

  if (request.method === "PUT") {
    return await sendProjectFileWrite(context, slug, request, reply);
  }

  if (request.method === "DELETE") {
    return await sendProjectFileDelete(context, slug, request, reply);
  }

  return false;
}
