import {
  createProject,
  deleteManagedProject,
  listProjects,
  readProject
} from "@project-manager/project-core";
import { type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import type { GatewayAiOptions } from "./ai-api.ts";
import {
  runProjectMutationChecks,
  type ProjectMutationChecksResult,
  type ProjectMutationChecksRunner
} from "./project-mutation-checks.ts";
import { updateProjectDescription } from "./project-fs-mutations.ts";

export interface ProjectApiContext {
  rootDir: string;
  aiOptions: GatewayAiOptions;
  mutationChecksRunner?: ProjectMutationChecksRunner;
}

interface CreateProjectBody {
  slug?: string;
  name?: string;
  runtime?: "static" | "dynamic";
  visibility?: "private" | "public";
  description?: string;
  force?: boolean;
  aiPrompt?: string;
  aiTaskSlug?: string;
  sandboxMode?: "danger-full-access" | "workspace-write";
  runChecks?: boolean;
}

const createProjectBodySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  runtime: z.enum(["static", "dynamic"]),
  visibility: z.enum(["private", "public"]).optional(),
  description: z.string().max(500).optional(),
  force: z.boolean().optional(),
  aiPrompt: z.string().min(1).optional(),
  aiTaskSlug: z.string().min(1).optional(),
  sandboxMode: z.enum(["danger-full-access", "workspace-write"]).optional(),
  runChecks: z.boolean().optional()
}).strict();

function buildProjectApiRecord(rootDir: string, slug: string) {
  const project = readProject(rootDir, slug);
  if (project === null) {
    return null;
  }

  return {
    ...project,
    path: `projects/${slug}`
  };
}

async function maybeRunChecks(
  rootDir: string,
  mutationChecksRunner: ProjectMutationChecksRunner | undefined,
  requested: boolean | undefined
): Promise<ProjectMutationChecksResult | null> {
  if (!requested) {
    return null;
  }

  const runner = mutationChecksRunner ?? runProjectMutationChecks;
  return await runner(rootDir);
}

function queueProjectBootstrapTask(context: ProjectApiContext, body: z.infer<typeof createProjectBodySchema>) {
  if (body.aiPrompt === undefined) {
    return null;
  }

  return context.aiOptions.queue?.enqueue({
    projectSlug: body.slug,
    taskSlug: body.aiTaskSlug ?? "init",
    prompt: body.aiPrompt,
    sandboxMode: body.sandboxMode
  }) ?? null;
}

function createProjectWithDescription(context: ProjectApiContext, body: z.infer<typeof createProjectBodySchema>) {
  const project = createProject(context.rootDir, {
    slug: body.slug,
    name: body.name,
    runtime: body.runtime,
    visibility: body.visibility,
    force: body.force
  });

  return body.description === undefined
    ? project
    : updateProjectDescription(context.rootDir, project.slug, body.description.trim()) ?? project;
}

async function sendProjectCreateApi(
  context: ProjectApiContext,
  pathname: string,
  request: FastifyRequest<{ Body: CreateProjectBody }>,
  reply: FastifyReply
): Promise<boolean> {
  if (pathname !== "/api/projects" || request.method !== "POST") {
    return false;
  }

  const parsedBody = createProjectBodySchema.safeParse(request.body);
  if (!parsedBody.success) {
    void reply.code(400).send({
      error: "invalid-project-create-body"
    });
    return true;
  }

  const body = parsedBody.data;

  try {
    const describedProject = createProjectWithDescription(context, body);
    const task = queueProjectBootstrapTask(context, body);
    const checks = await maybeRunChecks(context.rootDir, context.mutationChecksRunner, body.runChecks);

    void reply.code(201).send({
      project: {
        ...describedProject,
        path: `projects/${describedProject.slug}`
      },
      task,
      checks
    });
    return true;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    if (error.message.startsWith("project already exists:")) {
      void reply.code(409).send({
        error: "project-already-exists",
        slug: body.slug
      });
      return true;
    }

    throw error;
  }
}

function sendProjectDeleteApi(
  rootDir: string,
  pathname: string,
  method: string,
  reply: FastifyReply
): boolean {
  const projectSlugMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)$/);
  if (!projectSlugMatch || method !== "DELETE") {
    return false;
  }

  const slug = projectSlugMatch[1] ?? "";
  const project = deleteManagedProject(rootDir, slug);
  if (project === null) {
    void reply.code(404).send({
      error: "project-not-found",
      slug
    });
    return true;
  }

  void reply.code(200).send({ project });
  return true;
}

export async function sendProjectApi(
  context: ProjectApiContext,
  pathname: string,
  request: FastifyRequest<{ Body: CreateProjectBody }>,
  reply: FastifyReply
): Promise<boolean> {
  if (await sendProjectCreateApi(context, pathname, request, reply)) {
    return true;
  }

  if (sendProjectDeleteApi(context.rootDir, pathname, request.method, reply)) {
    return true;
  }

  if (pathname === "/api/projects" && request.method === "GET") {
    void reply.code(200).send({
      projects: listProjects(context.rootDir)
    });
    return true;
  }

  const projectSlugMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)$/);
  if (!projectSlugMatch || request.method !== "GET") {
    return false;
  }

  const slug = projectSlugMatch[1] ?? "";
  const project = buildProjectApiRecord(context.rootDir, slug);
  if (project === null) {
    void reply.code(404).send({
      error: "project-not-found",
      slug
    });
    return true;
  }

  void reply.code(200).send(project);
  return true;
}
