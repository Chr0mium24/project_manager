import { h, type Ref, type VNode } from "vue";
import type { AiTaskDiagnostics, AiTaskRecord, AiTaskSandboxMode, ManagedTaskSummary } from "../ai-task-api.ts";
import { renderAiTaskSummaryPanel } from "./project-manager-ai-task-details.ts";
import { renderAiWriteActions } from "./project-manager-ai-write-actions.ts";
import { renderPageHeader, renderStatusMessage } from "./project-manager-view-shared.ts";

interface AiRenderState {
  tasks: Ref<AiTaskRecord[]>;
  selectedTask: Ref<AiTaskRecord | null>;
  summary: Ref<ManagedTaskSummary | null>;
  diagnostics: Ref<AiTaskDiagnostics | null>;
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

function renderAiTaskList(state: AiRenderState): VNode {
  return h("aside", { class: "pm-card pm-subcard" }, [
    state.tasks.value.length === 0
      ? renderStatusMessage("No AI tasks for this project yet.")
      : h(
          "ul",
          { class: "pm-list" },
          state.tasks.value.map((task) =>
            h("li", [
              h(
                "button",
                {
                  type: "button",
                  class: ["pm-list-button", state.selectedTask.value?.taskId === task.taskId ? "is-active" : ""],
                  onClick: () => {
                    void state.selectTask(task.taskId);
                  }
                },
                [h("strong", task.taskSlug), h("small", task.status)]
              )
            ])
          )
        )
  ]);
}

function renderAiBody(state: AiRenderState): VNode {
  return h("div", { class: "pm-version-grid" }, [
    renderAiTaskList(state),
    renderAiTaskSummaryPanel({
      selectedTask: state.selectedTask,
      summary: state.summary,
      diagnostics: state.diagnostics
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
      title: "Repository AI tasks",
      description: "Review queued and completed AI tasks here, then apply a completed task when the summary is ready.",
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
        h("h2", { class: "pm-section-title" }, "Task queue"),
        h("p", { class: "pm-copy" }, "The left column is the queue. The right column is the selected task summary.")
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
