import {
  applyManagedTask,
  startManagedTask,
  summarizeManagedTask,
  validateManagedTask,
  type ManagedTaskApplyResult,
  type ManagedTaskManifest,
  type ManagedTaskSummary,
  type ManagedTaskValidation
} from "@project-manager/project-core";
import { type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";

interface StartManagedTaskBody {
  taskSlug?: string;
  mode?: "workspace" | "git-branch";
  force?: boolean;
}

interface ManagedTaskPayload {
  task: ManagedTaskManifest;
}

interface ManagedTaskSummaryPayload {
  summary: ManagedTaskSummary;
}

interface ManagedTaskValidationPayload {
  validation: ManagedTaskValidation;
}

interface ManagedTaskApplyPayload {
  result: ManagedTaskApplyResult;
}

const startManagedTaskBodySchema = z.object({
  taskSlug: z.string().min(1),
  mode: z.enum(["workspace", "git-branch"]).optional(),
  force: z.boolean().optional()
}).strict();

function sendTaskStarted(task: ManagedTaskManifest, reply: FastifyReply): boolean {
  const payload: ManagedTaskPayload = { task };
  void reply.code(201).send(payload);
  return true;
}

function sendManagedTaskStart(
  rootDir: string,
  slug: string,
  request: FastifyRequest<{ Body: StartManagedTaskBody }>,
  reply: FastifyReply
): boolean {
  const parsedBody = startManagedTaskBodySchema.safeParse(request.body);
  if (!parsedBody.success) {
    void reply.code(400).send({
      error: "invalid-managed-task-body",
      slug
    });
    return true;
  }

  try {
    const taskResult = startManagedTask(rootDir, {
      projectSlug: slug,
      taskSlug: parsedBody.data.taskSlug,
      mode: parsedBody.data.mode,
      force: parsedBody.data.force
    });
    return sendTaskStarted(taskResult.manifest, reply);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    if (error.message.startsWith("managed project not found:")) {
      void reply.code(404).send({
        error: "project-not-found",
        slug
      });
      return true;
    }

    if (error.message.startsWith("managed task already exists:")) {
      void reply.code(409).send({
        error: "managed-task-already-exists",
        slug,
        message: error.message
      });
      return true;
    }

    throw error;
  }
}

function sendManagedTaskSummary(
  rootDir: string,
  slug: string,
  taskSlug: string,
  reply: FastifyReply
): boolean {
  try {
    const summary = summarizeManagedTask(rootDir, {
      projectSlug: slug,
      taskSlug
    });
    const payload: ManagedTaskSummaryPayload = { summary };
    void reply.code(200).send(payload);
    return true;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    if (error.message.startsWith("managed task manifest not found:")) {
      void reply.code(404).send({
        error: "managed-task-not-found",
        slug,
        taskSlug
      });
      return true;
    }

    throw error;
  }
}

function sendManagedTaskValidation(
  rootDir: string,
  slug: string,
  taskSlug: string,
  reply: FastifyReply
): boolean {
  try {
    const validation = validateManagedTask(rootDir, {
      projectSlug: slug,
      taskSlug
    });
    const payload: ManagedTaskValidationPayload = { validation };
    void reply.code(200).send(payload);
    return true;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    if (error.message.startsWith("managed task manifest not found:")) {
      void reply.code(404).send({
        error: "managed-task-not-found",
        slug,
        taskSlug
      });
      return true;
    }

    throw error;
  }
}

function sendManagedTaskApply(
  rootDir: string,
  slug: string,
  taskSlug: string,
  reply: FastifyReply
): boolean {
  try {
    const result = applyManagedTask(rootDir, {
      projectSlug: slug,
      taskSlug
    });
    const payload: ManagedTaskApplyPayload = { result };
    void reply.code(200).send(payload);
    return true;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    if (error.message.startsWith("managed task manifest not found:")) {
      void reply.code(404).send({
        error: "managed-task-not-found",
        slug,
        taskSlug
      });
      return true;
    }

    throw error;
  }
}

export function sendManagedTaskApi(
  rootDir: string,
  pathname: string,
  request: FastifyRequest<{ Body: StartManagedTaskBody }>,
  reply: FastifyReply
): boolean {
  if (sendManagedTaskLifecycleApi(rootDir, pathname, request.method, reply)) {
    return true;
  }

  return sendManagedTaskCreateApi(rootDir, pathname, request, reply);
}

function sendManagedTaskLifecycleApi(
  rootDir: string,
  pathname: string,
  method: string,
  reply: FastifyReply
): boolean {
  const lifecycleRoutes = [
    {
      pattern: /^\/api\/projects\/([a-z0-9-]+)\/tasks\/([a-z0-9-]+)\/apply$/,
      handler: sendManagedTaskApply
    },
    {
      pattern: /^\/api\/projects\/([a-z0-9-]+)\/tasks\/([a-z0-9-]+)\/validate$/,
      handler: sendManagedTaskValidation
    },
    {
      pattern: /^\/api\/projects\/([a-z0-9-]+)\/tasks\/([a-z0-9-]+)\/summarize$/,
      handler: sendManagedTaskSummary
    }
  ] as const;

  if (method !== "POST") {
    return false;
  }

  for (const route of lifecycleRoutes) {
    const match = pathname.match(route.pattern);
    if (!match) {
      continue;
    }

    const slug = match[1] ?? "";
    const taskSlug = match[2] ?? "";
    return route.handler(rootDir, slug, taskSlug, reply);
  }

  return false;
}

function sendManagedTaskCreateApi(
  rootDir: string,
  pathname: string,
  request: FastifyRequest<{ Body: StartManagedTaskBody }>,
  reply: FastifyReply
): boolean {
  const taskMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/tasks$/);
  if (!taskMatch || request.method !== "POST") {
    return false;
  }

  const slug = taskMatch[1] ?? "";
  return sendManagedTaskStart(rootDir, slug, request, reply);
}
