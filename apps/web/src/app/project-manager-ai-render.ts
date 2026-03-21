import { h, type Ref, type VNode } from "vue";
import type { AiTaskDiagnostics, AiTaskRecord, AiTaskSandboxMode, ManagedTaskSummary } from "../ai-task-api.ts";
import { buildAiTaskSessions } from "./project-manager-ai-sessions.ts";
import { renderAiTaskSummaryPanel } from "./project-manager-ai-task-details.ts";
import { renderAiWriteActions } from "./project-manager-ai-write-actions.ts";
import { renderPageHeader, renderStatusMessage } from "./project-manager-view-shared.ts";

interface AiRenderState {
  tasks: Ref<AiTaskRecord[]>;
  selectedTask: Ref<AiTaskRecord | null>;
  summariesByTaskId: Ref<Record<string, ManagedTaskSummary | null | undefined>>;
  diagnosticsByTaskId: Ref<Record<string, AiTaskDiagnostics | null | undefined>>;
  error: Ref<string | null>;
  isBusy: Ref<boolean>;
  composeOpen: Ref<boolean>;
  taskSlug: Ref<string>;
  prompt: Ref<string>;
  sandboxMode: Ref<AiTaskSandboxMode>;
  parentTaskId: Ref<string | null>;
  selectTask(taskId: string): Promise<void>;
  createTask(): Promise<void>;
  applySelectedTask(): Promise<void>;
  openNewTaskComposer(): void;
  openFollowUpComposer(): void;
}

function renderAiSessionList(state: AiRenderState): VNode {
  const sessions = buildAiTaskSessions(state.tasks.value);

  return h("aside", { class: "pm-card pm-subcard" }, [
    sessions.length === 0
      ? renderStatusMessage("No AI sessions for this project yet.")
      : h(
          "ul",
          { class: "pm-list" },
          sessions.map((session) =>
            h("li", [
              h(
                "button",
                {
                  type: "button",
                  class: [
                    "pm-list-button",
                    session.tasks.some((task) => task.taskId === state.selectedTask.value?.taskId) ? "is-active" : ""
                  ],
                  onClick: () => {
                    void state.selectTask(session.latestTask.taskId);
                  }
                },
                [
                  h("strong", session.title),
                  h("small", `${String(session.tasks.length)} turns · ${session.status}`)
                ]
              )
            ])
          )
        )
  ]);
}

function renderAiBody(state: AiRenderState): VNode {
  return h("div", { class: "pm-version-grid" }, [
    renderAiSessionList(state),
    renderAiTaskSummaryPanel({
      tasks: state.tasks,
      selectedTask: state.selectedTask,
      summariesByTaskId: state.summariesByTaskId,
      diagnosticsByTaskId: state.diagnosticsByTaskId
    })
  ]);
}

export function renderAiView(
  projectSlug: string,
  state: AiRenderState,
  publicHref: string | null
): VNode {
  return h("div", { class: "pm-view", "data-view": "ai" }, [
    renderPageHeader({
      projectSlug,
      currentView: "ai",
      title: "Repository AI sessions",
      description: "Work session by session. Pick a conversation on the left, inspect the turn history on the right, then continue or apply when it is ready.",
      action: publicHref
        ? h(
            "a",
            {
              href: publicHref,
              class: "pm-project-link"
            },
            "Open page"
          )
        : null
    }),
    h("section", { class: "pm-card pm-stack" }, [
      h("div", { class: "pm-page-copy" }, [
        h("h2", { class: "pm-section-title" }, "Sessions"),
        h("p", { class: "pm-copy" }, "The left column is the session list. The right column shows the selected conversation flow.")
      ]),
      state.error.value ? renderStatusMessage(state.error.value, "error") : null,
      renderAiBody(state)
    ]),
    renderAiWriteActions({
      composeOpen: state.composeOpen.value,
      taskSlug: state.taskSlug.value,
      prompt: state.prompt.value,
      sandboxMode: state.sandboxMode.value,
      isBusy: state.isBusy.value,
      canApplySelectedTask: state.selectedTask.value?.status === "completed",
      canContinueSelectedTask:
        state.selectedTask.value !== null
        && state.selectedTask.value.status !== "queued"
        && state.selectedTask.value.status !== "running",
      continueTaskLabel: state.parentTaskId.value === null ? null : state.selectedTask.value?.taskSlug ?? null,
      setTaskSlug: (value) => {
        state.taskSlug.value = value;
      },
      setPrompt: (value) => {
        state.prompt.value = value;
      },
      setSandboxMode: (value) => {
        state.sandboxMode.value = value;
      },
      openNewTaskComposer: () => {
        state.openNewTaskComposer();
      },
      openFollowUpComposer: () => {
        state.openFollowUpComposer();
      },
      createTask: () => {
        void state.createTask();
      },
      applySelectedTask: () => {
        void state.applySelectedTask();
      }
    })
  ]);
}
