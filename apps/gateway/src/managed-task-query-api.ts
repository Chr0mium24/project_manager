import {
  listManagedTasks,
  readManagedTask,
  type ManagedTaskManifest
} from "@project-manager/project-core";
import { type FastifyReply } from "fastify";

interface ManagedTaskPayload {
  task: ManagedTaskManifest;
}

interface ManagedTaskListPayload {
  tasks: ManagedTaskManifest[];
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

export function sendManagedTaskQueryApi(
  rootDir: string,
  pathname: string,
  method: string,
  reply: FastifyReply
): boolean {
  if (method !== "GET") {
    return false;
  }

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
