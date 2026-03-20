import { computed, defineComponent, h, onMounted, ref, watch, type ComputedRef, type Ref, type VNode } from "vue";
import { useRoute } from "vue-router";
import {
  AiTaskApiClient,
  type AiTaskDiagnostics,
  type AiTaskRecord,
  type ManagedTaskSummary
} from "../ai-task-api.ts";
import { useProjectContextStore } from "./project-context-store.ts";
import { renderAiTaskSummaryPanel } from "./project-manager-ai-task-details.ts";
import { renderPageHeader, renderStatusMessage } from "./project-manager-view-shared.ts";
import { runtimeHrefForSlug } from "./project-runtime-link.ts";
import { renderAiWriteActions } from "./project-manager-ai-write-actions.ts";
interface AiState {
  tasks: Ref<AiTaskRecord[]>;
  selectedTask: Ref<AiTaskRecord | null>;
  summary: Ref<ManagedTaskSummary | null>;
  diagnostics: Ref<AiTaskDiagnostics | null>;
  error: Ref<string | null>;
  isBusy: Ref<boolean>;
  composeOpen: Ref<boolean>;
  taskSlug: Ref<string>;
  prompt: Ref<string>;
  parentTaskId: Ref<string | null>;
  refreshTasks(): Promise<void>;
  selectTask(taskId: string): Promise<void>;
  createTask(): Promise<void>;
  applySelectedTask(): Promise<void>;
  openNewTaskComposer(): void;
  openFollowUpComposer(): void;
  reset(): void;
}
interface AiQueryContext {
  projectSlug: ComputedRef<string>;
  adminToken: ComputedRef<string>;
  tasks: Ref<AiTaskRecord[]>;
  selectedTask: Ref<AiTaskRecord | null>;
  summary: Ref<ManagedTaskSummary | null>;
  diagnostics: Ref<AiTaskDiagnostics | null>;
  error: Ref<string | null>;
}
interface AiMutationContext {
  projectSlug: ComputedRef<string>;
  adminToken: ComputedRef<string>;
  selectedTask: Ref<AiTaskRecord | null>;
  error: Ref<string | null>;
  isBusy: Ref<boolean>;
  composeOpen: Ref<boolean>;
  taskSlug: Ref<string>;
  prompt: Ref<string>;
  parentTaskId: Ref<string | null>;
  queries: ReturnType<typeof createAiQueries>;
}
function createClient(adminToken: string): AiTaskApiClient {
  return adminToken.length === 0
    ? new AiTaskApiClient()
    : new AiTaskApiClient({
        adminToken
      });
}
function createAiQueries(context: AiQueryContext) {
  async function selectTask(taskId: string) {
    if (!taskId) {
      return;
    }
    try {
      context.error.value = null;
      context.summary.value = null;
      context.diagnostics.value = null;
      const client = createClient(context.adminToken.value);
      const task = await client.readTask(taskId);
      context.selectedTask.value = task;
      context.diagnostics.value = await client.readDiagnostics(taskId);
      context.summary.value = task.summaryPath === null ? null : await client.readSummary(taskId);
    } catch (selectError) {
      context.error.value = selectError instanceof Error ? selectError.message : "unknown ai task error";
    }
  }
  async function refreshTasks() {
    try {
      const client = createClient(context.adminToken.value);
      const allTasks = await client.listTasks();
      context.tasks.value = allTasks.filter((task) => task.projectSlug === context.projectSlug.value);
      const selectedTaskId = context.selectedTask.value?.taskId ?? context.tasks.value[0]?.taskId ?? "";
      if (selectedTaskId) {
        await selectTask(selectedTaskId);
      }
    } catch (refreshError) {
      context.error.value = refreshError instanceof Error ? refreshError.message : "unknown ai task error";
    }
  }
  return { refreshTasks, selectTask };
}
function validateTaskCreation(
  projectSlug: string,
  adminToken: string,
  taskSlug: string,
  prompt: string
): string | null {
  if (projectSlug.length === 0) {
    return "project slug is required";
  }
  if (adminToken.length === 0) {
    return "Admin access is required for AI task creation. Open Admin access from the header.";
  }
  if (taskSlug.trim().length === 0 || prompt.trim().length === 0) {
    return "Task slug and prompt are required.";
  }
  return null;
}
function createAiMutations(context: AiMutationContext) {
  async function createTask() {
    const validationError = validateTaskCreation(
      context.projectSlug.value,
      context.adminToken.value,
      context.taskSlug.value,
      context.prompt.value
    );
    if (validationError) {
      context.error.value = validationError;
      return;
    }
    context.isBusy.value = true;
    context.error.value = null;
    try {
      const client = createClient(context.adminToken.value);
      const input = {
        projectSlug: context.projectSlug.value,
        taskSlug: context.taskSlug.value.trim(),
        prompt: context.prompt.value.trim()
      };
      const created = await client.createTask({
        ...input,
        ...(context.parentTaskId.value === null ? {} : { parentTaskId: context.parentTaskId.value })
      });
      const settled = await client.waitForTask(created.taskId, {
        pollIntervalMs: 500
      });
      context.taskSlug.value = "";
      context.prompt.value = "";
      context.parentTaskId.value = null;
      context.composeOpen.value = false;
      await context.queries.refreshTasks();
      await context.queries.selectTask(settled.taskId);
    } catch (createError) {
      context.error.value = createError instanceof Error ? createError.message : "unknown ai task error";
    } finally {
      context.isBusy.value = false;
    }
  }
  async function applySelectedTask() {
    if (context.selectedTask.value === null) {
      return;
    }
    if (context.adminToken.value.length === 0) {
      context.error.value = "Admin access is required for apply. Open Admin access from the header.";
      return;
    }
    context.isBusy.value = true;
    context.error.value = null;
    try {
      const client = createClient(context.adminToken.value);
      const applied = await client.applyTask(context.selectedTask.value.taskId);
      await context.queries.refreshTasks();
      context.selectedTask.value = applied.task;
    } catch (applyError) {
      context.error.value = applyError instanceof Error ? applyError.message : "unknown ai task error";
    } finally {
      context.isBusy.value = false;
    }
  }
  return { createTask, applySelectedTask };
}
function createAiState(projectSlug: ComputedRef<string>, adminToken: ComputedRef<string>): AiState {
  const tasks = ref<AiTaskRecord[]>([]);
  const selectedTask = ref<AiTaskRecord | null>(null);
  const summary = ref<ManagedTaskSummary | null>(null);
  const diagnostics = ref<AiTaskDiagnostics | null>(null);
  const error = ref<string | null>(null);
  const isBusy = ref(false);
  const composeOpen = ref(false);
  const taskSlug = ref("");
  const prompt = ref("");
  const parentTaskId = ref<string | null>(null);
  function openNewTaskComposer() {
    const shouldSwitchFromFollowUp = parentTaskId.value !== null;
    parentTaskId.value = null;
    composeOpen.value = shouldSwitchFromFollowUp ? true : !composeOpen.value;
  }
  function openFollowUpComposer() {
    if (selectedTask.value === null) {
      return;
    }
    parentTaskId.value = selectedTask.value.taskId;
    composeOpen.value = true;
  }
  function reset() {
    tasks.value = [];
    selectedTask.value = null;
    summary.value = null;
    diagnostics.value = null;
    error.value = null;
    isBusy.value = false;
    composeOpen.value = false;
    taskSlug.value = "";
    prompt.value = "";
    parentTaskId.value = null;
  }
  const queries = createAiQueries({
    projectSlug,
    adminToken,
    tasks,
    selectedTask,
    summary,
    diagnostics,
    error
  });
  const mutations = createAiMutations({
    projectSlug,
    adminToken,
    selectedTask,
    error,
    isBusy,
    composeOpen,
    taskSlug,
    prompt,
    parentTaskId,
    queries
  });
  return {
    tasks,
    selectedTask,
    summary,
    diagnostics,
    error,
    isBusy,
    composeOpen,
    taskSlug,
    prompt,
    parentTaskId,
    refreshTasks: queries.refreshTasks,
    selectTask: queries.selectTask,
    createTask: mutations.createTask,
    applySelectedTask: mutations.applySelectedTask,
    openNewTaskComposer,
    openFollowUpComposer,
    reset
  };
}
function renderAiBody(state: AiState): VNode {
  return h("div", { class: "pm-version-grid" }, [
    renderAiTaskList(state),
    renderAiTaskSummaryPanel({
      selectedTask: state.selectedTask,
      summary: state.summary,
      diagnostics: state.diagnostics
    })
  ]);
}

function renderAiTaskList(state: AiState): VNode {
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
function renderAiView(
  projectSlug: string,
  state: AiState,
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
export const ProjectAiTasksView = defineComponent({
  name: "ProjectAiTasksView",
  setup() {
    const route = useRoute();
    const context = useProjectContextStore();
    const projectSlug = computed(() => String(route.params.slug ?? ""));
    const adminToken = computed(() => context.adminToken.trim());
    const publicHref = computed(() => runtimeHrefForSlug(context.projects, projectSlug.value));
    const state = createAiState(projectSlug, adminToken);

    onMounted(() => {
      void state.refreshTasks();
    });
    watch(projectSlug, () => {
      state.reset();
      void state.refreshTasks();
    });

    return () => renderAiView(projectSlug.value, state, publicHref.value);
  }
});
