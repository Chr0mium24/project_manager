import type { AiTaskRecord, AiTaskStatus } from "../ai-task-api.ts";

export interface AiTaskSession {
  key: string;
  title: string;
  tasks: AiTaskRecord[];
  latestTask: AiTaskRecord;
  status: AiTaskStatus;
}

function compareByCreatedAtAscending(left: AiTaskRecord, right: AiTaskRecord): number {
  return left.createdAt.localeCompare(right.createdAt);
}

function resolveSessionRoot(task: AiTaskRecord, taskIndex: Map<string, AiTaskRecord>): string {
  let current = task;
  while (current.parentTaskId) {
    const parent = taskIndex.get(current.parentTaskId);
    if (parent === undefined) {
      return current.parentTaskId;
    }
    current = parent;
  }

  return current.taskId;
}

export function buildAiTaskSessions(tasks: AiTaskRecord[]): AiTaskSession[] {
  const taskIndex = new Map(tasks.map((task) => [task.taskId, task]));
  const grouped = new Map<string, AiTaskRecord[]>();

  for (const task of tasks) {
    const sessionKey = task.sessionId ?? resolveSessionRoot(task, taskIndex);
    const sessionTasks = grouped.get(sessionKey);
    if (sessionTasks === undefined) {
      grouped.set(sessionKey, [task]);
      continue;
    }

    sessionTasks.push(task);
  }

  return [...grouped.entries()]
    .flatMap(([key, sessionTasks]) => {
      const sortedTasks = [...sessionTasks].sort(compareByCreatedAtAscending);
      const firstTask = sortedTasks[0];
      const latestTask = sortedTasks[sortedTasks.length - 1];
      if (firstTask === undefined || latestTask === undefined) {
        return [];
      }

      return [{
        key,
        title: firstTask.taskSlug,
        tasks: sortedTasks,
        latestTask,
        status: latestTask.status
      }];
    })
    .sort((left, right) => right.latestTask.createdAt.localeCompare(left.latestTask.createdAt));
}

export function findAiTaskSession(tasks: AiTaskRecord[], taskId: string | null): AiTaskSession | null {
  if (taskId === null) {
    return null;
  }

  return buildAiTaskSessions(tasks).find((session) => session.tasks.some((task) => task.taskId === taskId)) ?? null;
}
