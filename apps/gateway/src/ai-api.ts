import {
  applyAiTask,
  createAiTask,
  listAiTasks,
  readAiTask,
  readAiTaskDiagnostics,
  readAiTaskSummary,
  type AiTaskDiagnostics,
  type AiTaskRecord,
  type CodexExecutor
} from "@project-manager/ai-core";
import { type ManagedTaskApplyResult, type ManagedTaskSummary } from "@project-manager/project-core";
import { type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";

export interface GatewayAiOptions {
  executor?: CodexExecutor;
  queue?: {
    enqueue(options: CreateAiTaskBody): AiTaskRecord;
  };
}

interface AiRequestContext {
  rootDir: string;
  aiOptions?: GatewayAiOptions;
}

interface CreateAiTaskBody {
  projectSlug?: string;
  taskSlug?: string;
  prompt?: string;
  force?: boolean;
  parentTaskId?: string;
}

interface AiTaskPayload {
  task: AiTaskRecord;
}

interface AiTaskListPayload {
  tasks: AiTaskRecord[];
}

interface AiTaskSummaryPayload {
  summary: ManagedTaskSummary;
}

interface AiTaskDiagnosticsPayload {
  diagnostics: AiTaskDiagnostics;
}

interface AiTaskApplyPayload {
  task: AiTaskRecord;
  result: ManagedTaskApplyResult;
}

interface CreateErrorMatch {
  code: string;
  prefix: string;
  statusCode: 404 | 409;
}

const createAiTaskBodySchema = z.object({
  projectSlug: z.string().min(1),
  taskSlug: z.string().min(1),
  prompt: z.string().min(1),
  force: z.boolean().optional(),
  parentTaskId: z.string().min(1).optional()
}).strict();

const createErrorMatches: CreateErrorMatch[] = [
  { code: "project-not-found", prefix: "managed project not found:", statusCode: 404 },
  { code: "managed-task-already-exists", prefix: "managed task already exists:", statusCode: 409 },
  { code: "parent-ai-task-project-mismatch", prefix: "parent ai task project mismatch:", statusCode: 409 },
  { code: "parent-ai-task-not-ready", prefix: "parent ai task is not ready to continue:", statusCode: 409 },
  { code: "parent-ai-task-workspace-not-found", prefix: "parent ai task workspace not found:", statusCode: 409 },
  { code: "parent-ai-task-not-found", prefix: "ai task not found:", statusCode: 404 }
];

function sendAiTaskCreateError(
  reply: FastifyReply,
  error: Error,
  body: z.infer<typeof createAiTaskBodySchema>
): boolean {
  const matchedError = createErrorMatches.find((match) => error.message.startsWith(match.prefix));
  if (!matchedError) {
    return false;
  }

  if (matchedError.code === "project-not-found") {
    void reply.code(matchedError.statusCode).send({
      error: matchedError.code,
      slug: body.projectSlug
    });
    return true;
  }

  if (matchedError.code === "managed-task-already-exists") {
    void reply.code(matchedError.statusCode).send({
      error: matchedError.code,
      slug: body.projectSlug,
      taskSlug: body.taskSlug
    });
    return true;
  }

  void reply.code(matchedError.statusCode).send({
    error: matchedError.code,
    taskId: body.parentTaskId ?? null
  });
  return true;
}

function sendAiTaskList(rootDir: string, pathname: string, reply: FastifyReply): boolean {
  if (pathname !== "/api/ai/tasks") {
    return false;
  }

  const payload: AiTaskListPayload = {
    tasks: listAiTasks(rootDir)
  };
  void reply.code(200).send(payload);
  return true;
}

function sendAiTaskRead(rootDir: string, pathname: string, reply: FastifyReply): boolean {
  const taskMatch = pathname.match(/^\/api\/ai\/tasks\/([a-z0-9-]+)$/);
  if (!taskMatch) {
    return false;
  }

  const taskId = taskMatch[1] ?? "";
  const task = readAiTask(rootDir, taskId);
  if (task === null) {
    void reply.code(404).send({
      error: "ai-task-not-found",
      taskId
    });
    return true;
  }

  const payload: AiTaskPayload = { task };
  void reply.code(200).send(payload);
  return true;
}

function sendAiTaskSummary(rootDir: string, pathname: string, reply: FastifyReply): boolean {
  const taskMatch = pathname.match(/^\/api\/ai\/tasks\/([a-z0-9-]+)\/summary$/);
  if (!taskMatch) {
    return false;
  }

  const taskId = taskMatch[1] ?? "";
  try {
    const summary = readAiTaskSummary(rootDir, taskId);
    if (summary === null) {
      void reply.code(404).send({
        error: "ai-task-summary-not-found",
        taskId
      });
      return true;
    }

    const payload: AiTaskSummaryPayload = { summary };
    void reply.code(200).send(payload);
    return true;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    if (error.message.startsWith("ai task not found:")) {
      void reply.code(404).send({
        error: "ai-task-not-found",
        taskId
      });
      return true;
    }

    throw error;
  }
}

function sendAiTaskDiagnostics(rootDir: string, pathname: string, reply: FastifyReply): boolean {
  const taskMatch = pathname.match(/^\/api\/ai\/tasks\/([a-z0-9-]+)\/diagnostics$/);
  if (!taskMatch) {
    return false;
  }

  const taskId = taskMatch[1] ?? "";
  try {
    const payload: AiTaskDiagnosticsPayload = {
      diagnostics: readAiTaskDiagnostics(rootDir, taskId)
    };
    void reply.code(200).send(payload);
    return true;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }
    if (error.message.startsWith("ai task not found:")) {
      void reply.code(404).send({
        error: "ai-task-not-found",
        taskId
      });
      return true;
    }

    throw error;
  }
}

function readRequiredGatewayAiTask(rootDir: string, taskId: string): AiTaskRecord {
  const task = readAiTask(rootDir, taskId);
  if (task === null) {
    throw new Error(`ai task not found: ${taskId}`);
  }

  return task;
}

function sendAiTaskApply(rootDir: string, pathname: string, reply: FastifyReply): boolean {
  const taskMatch = pathname.match(/^\/api\/ai\/tasks\/([a-z0-9-]+)\/apply$/);
  if (!taskMatch) {
    return false;
  }

  const taskId = taskMatch[1] ?? "";
  try {
    const result = applyAiTask(rootDir, taskId);
    const task = readRequiredGatewayAiTask(rootDir, taskId);
    const payload: AiTaskApplyPayload = { task, result };
    void reply.code(200).send(payload);
    return true;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    if (error.message.startsWith("ai task not found:")) {
      void reply.code(404).send({
        error: "ai-task-not-found",
        taskId
      });
      return true;
    }

    if (
      error.message.startsWith("ai task is not ready to apply:")
      || error.message.startsWith("ai task validation not found:")
    ) {
      void reply.code(409).send({
        error: "ai-task-not-applicable",
        taskId
      });
      return true;
    }

    throw error;
  }
}

function sendAiTaskCreate(
  context: AiRequestContext,
  request: FastifyRequest<{ Body: CreateAiTaskBody }>,
  reply: FastifyReply
): boolean {
  const parsedBody = createAiTaskBodySchema.safeParse(request.body);
  if (!parsedBody.success) {
    void reply.code(400).send({
      error: "invalid-ai-task-body"
    });
    return true;
  }

  try {
    const task = context.aiOptions?.queue?.enqueue(parsedBody.data)
      ?? createAiTask(context.rootDir, parsedBody.data);
    const payload: AiTaskPayload = { task };
    void reply.code(202).send(payload);
    return true;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }
    if (sendAiTaskCreateError(reply, error, parsedBody.data)) {
      return true;
    }

    throw error;
  }
}

export function sendAiTaskApi(
  context: AiRequestContext,
  pathname: string,
  request: FastifyRequest<{ Body: CreateAiTaskBody }>,
  reply: FastifyReply
): boolean {
  if (request.method === "GET") {
    return sendAiTaskList(context.rootDir, pathname, reply)
      || sendAiTaskDiagnostics(context.rootDir, pathname, reply)
      || sendAiTaskSummary(context.rootDir, pathname, reply)
      || sendAiTaskRead(context.rootDir, pathname, reply);
  }

  if (request.method === "POST" && pathname === "/api/ai/tasks") {
    return sendAiTaskCreate(context, request, reply);
  }

  if (request.method === "POST") {
    return sendAiTaskApply(context.rootDir, pathname, reply);
  }

  return false;
}
