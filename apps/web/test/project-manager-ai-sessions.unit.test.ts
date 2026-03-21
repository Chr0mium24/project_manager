import { describe, expect, it } from "vitest";
import { buildAiTaskSessions } from "../src/app/project-manager-ai-sessions.ts";
import type { AiTaskRecord } from "../src/ai-task-api.ts";

function createTask(overrides: Partial<AiTaskRecord>): AiTaskRecord {
  return {
    schemaVersion: 1,
    taskId: "task-1",
    kind: "managed-project-edit",
    status: "completed",
    projectSlug: "demo",
    taskSlug: "init",
    prompt: "demo",
    sandboxMode: "workspace-write",
    parentTaskId: null,
    sessionId: null,
    createdAt: "2026-03-21T10:00:00.000Z",
    completedAt: "2026-03-21T10:01:00.000Z",
    managedTaskPath: "storage/managed-tasks/demo/init/task.json",
    workspaceProjectPath: "storage/managed-tasks/demo/init/workspace/demo",
    stdoutPath: null,
    stderrPath: null,
    summaryPath: null,
    validationPath: null,
    codexExitCode: 0,
    error: null,
    appliedAt: null,
    ...overrides
  };
}

describe("buildAiTaskSessions", () => {
  it("groups follow-up tasks into the same session", () => {
    const tasks = [
      createTask({
        taskId: "task-1",
        taskSlug: "init",
        sessionId: "session-1",
        createdAt: "2026-03-21T10:00:00.000Z"
      }),
      createTask({
        taskId: "task-2",
        taskSlug: "follow-up",
        parentTaskId: "task-1",
        sessionId: "session-1",
        createdAt: "2026-03-21T10:05:00.000Z"
      })
    ];

    expect(buildAiTaskSessions(tasks)).toEqual([
      expect.objectContaining({
        key: "session-1",
        title: "init",
        status: "completed",
        tasks: [
          expect.objectContaining({ taskId: "task-1" }),
          expect.objectContaining({ taskId: "task-2" })
        ]
      })
    ]);
  });

  it("falls back to parent task ancestry when session ids are missing", () => {
    const tasks = [
      createTask({
        taskId: "task-1",
        taskSlug: "init",
        createdAt: "2026-03-21T10:00:00.000Z"
      }),
      createTask({
        taskId: "task-2",
        taskSlug: "fix",
        parentTaskId: "task-1",
        createdAt: "2026-03-21T10:06:00.000Z"
      })
    ];

    expect(buildAiTaskSessions(tasks)[0]).toMatchObject({
      key: "task-1",
      title: "init",
      status: "completed"
    });
  });
});
