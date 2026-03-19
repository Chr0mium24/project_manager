import {
  listManagedTasks,
  readManagedTask,
  readManagedTaskSummary,
  readManagedTaskValidation,
  type ManagedTaskManifest,
  type ManagedTaskSummary,
  type ManagedTaskValidation
} from "@project-manager/project-core";
import { type FastifyReply } from "fastify";

interface ManagedTaskPayload {
  task: ManagedTaskManifest;
}

interface ManagedTaskListPayload {
  tasks: ManagedTaskManifest[];
}

interface ManagedTaskSummaryPayload {
  summary: ManagedTaskSummary;
}

interface ManagedTaskValidationPayload {
  validation: ManagedTaskValidation;
}

function sendManagedTaskList(rootDir: string, slug: string, reply: FastifyReply): boolean {
  const payload: ManagedTaskListPayload = {
    tasks: listManagedTasks(rootDir, slug)
  };
  void reply.code(200).send(payload);
  return true;
}

function sendManagedTaskRead(
  rootDir: string,
  slug: string,
  taskSlug: string,
  reply: FastifyReply
): boolean {
  const task = readManagedTask(rootDir, slug, taskSlug);
  if (task === null) {
    void reply.code(404).send({
      error: "managed-task-not-found",
      slug,
      taskSlug
    });
    return true;
  }

  const payload: ManagedTaskPayload = { task };
  void reply.code(200).send(payload);
  return true;
}

function sendManagedTaskSummaryRead(
  rootDir: string,
  slug: string,
  taskSlug: string,
  reply: FastifyReply
): boolean {
  const summary = readManagedTaskSummary(rootDir, slug, taskSlug);
  if (summary === null) {
    void reply.code(404).send({
      error: "managed-task-summary-not-found",
      slug,
      taskSlug
    });
    return true;
  }

  const payload: ManagedTaskSummaryPayload = { summary };
  void reply.code(200).send(payload);
  return true;
}

function sendManagedTaskValidationRead(
  rootDir: string,
  slug: string,
  taskSlug: string,
  reply: FastifyReply
): boolean {
  const validation = readManagedTaskValidation(rootDir, slug, taskSlug);
  if (validation === null) {
    void reply.code(404).send({
      error: "managed-task-validation-not-found",
      slug,
      taskSlug
    });
    return true;
  }

  const payload: ManagedTaskValidationPayload = { validation };
  void reply.code(200).send(payload);
  return true;
}

function sendManagedTaskArtifactRead(
  rootDir: string,
  pathname: string,
  reply: FastifyReply
): boolean {
  const artifactRoutes = [
    {
      pattern: /^\/api\/projects\/([a-z0-9-]+)\/tasks\/([a-z0-9-]+)\/summary$/,
      handler: sendManagedTaskSummaryRead
    },
    {
      pattern: /^\/api\/projects\/([a-z0-9-]+)\/tasks\/([a-z0-9-]+)\/validation$/,
      handler: sendManagedTaskValidationRead
    }
  ] as const;

  for (const route of artifactRoutes) {
    const match = pathname.match(route.pattern);
    if (!match) {
      continue;
    }

    return route.handler(rootDir, match[1] ?? "", match[2] ?? "", reply);
  }

  return false;
}

function sendManagedTaskEntityRead(
  rootDir: string,
  pathname: string,
  reply: FastifyReply
): boolean {
  const singleTaskMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/tasks\/([a-z0-9-]+)$/);
  if (singleTaskMatch) {
    return sendManagedTaskRead(rootDir, singleTaskMatch[1] ?? "", singleTaskMatch[2] ?? "", reply);
  }

  const taskListMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/tasks$/);
  if (!taskListMatch) {
    return false;
  }

  return sendManagedTaskList(rootDir, taskListMatch[1] ?? "", reply);
}

export function sendManagedTaskQueryApi(
  rootDir: string,
  pathname: string,
  method: string,
  reply: FastifyReply
): boolean {
  if (method !== "GET") {
    return false;
  }

  if (sendManagedTaskArtifactRead(rootDir, pathname, reply)) {
    return true;
  }

  return sendManagedTaskEntityRead(rootDir, pathname, reply);
}
