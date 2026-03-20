import { computed, defineComponent, h, onMounted, ref, watch, type ComputedRef, type Ref, type VNode } from "vue";
import { useRoute } from "vue-router";
import { AiTaskApiClient, type AiTaskRecord, type ManagedTaskSummary } from "../ai-task-api.ts";
import { useProjectContextStore } from "./project-context-store.ts";
import { renderPageHeader, renderStatusMessage } from "./project-manager-view-shared.ts";
import { renderAiWriteActions } from "./project-manager-ai-write-actions.ts";
interface AiState {
  tasks: Ref<AiTaskRecord[]>;
  selectedTask: Ref<AiTaskRecord | null>;
  summary: Ref<ManagedTaskSummary | null>;
  error: Ref<string | null>;
  isBusy: Ref<boolean>;
  composeOpen: Ref<boolean>;
  taskSlug: Ref<string>;
  prompt: Ref<string>;
  refreshTasks(): Promise<void>;
  selectTask(taskId: string): Promise<void>;
  createTask(): Promise<void>;
  applySelectedTask(): Promise<void>;
  reset(): void;
}
interface AiQueryContext {
  projectSlug: ComputedRef<string>;
  adminToken: ComputedRef<string>;
  tasks: Ref<AiTaskRecord[]>;
  selectedTask: Ref<AiTaskRecord | null>;
  summary: Ref<ManagedTaskSummary | null>;
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
      const client = createClient(context.adminToken.value);
      const task = await client.readTask(taskId);
      context.selectedTask.value = task;
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
      if (context.tasks.value.length > 0 && context.selectedTask.value === null) {
        await selectTask(context.tasks.value[0]?.taskId ?? "");
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
    return "Admin token is required for AI task creation.";
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
      const created = await client.createTask({
        projectSlug: context.projectSlug.value,
        taskSlug: context.taskSlug.value.trim(),
        prompt: context.prompt.value.trim()
      });
      const settled = await client.waitForTask(created.taskId, {
        pollIntervalMs: 500
      });
      context.taskSlug.value = "";
      context.prompt.value = "";
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
      context.error.value = "Admin token is required for apply.";
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
  const error = ref<string | null>(null);
  const isBusy = ref(false);
  const composeOpen = ref(false);
  const taskSlug = ref("");
  const prompt = ref("");
  function reset() {
    tasks.value = [];
    selectedTask.value = null;
    summary.value = null;
    error.value = null;
    isBusy.value = false;
    composeOpen.value = false;
    taskSlug.value = "";
    prompt.value = "";
  }
  const queries = createAiQueries({
    projectSlug,
    adminToken,
    tasks,
    selectedTask,
    summary,
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
    queries
  });
  return {
    tasks,
    selectedTask,
    summary,
    error,
    isBusy,
    composeOpen,
    taskSlug,
    prompt,
    refreshTasks: queries.refreshTasks,
    selectTask: queries.selectTask,
    createTask: mutations.createTask,
    applySelectedTask: mutations.applySelectedTask,
    reset
  };
}
function renderAiBody(state: AiState): VNode {
  return h("div", { class: "pm-version-grid" }, [
    renderAiTaskList(state),
    renderAiTaskSummary(state)
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
function renderAiTaskSummary(state: AiState): VNode {
  if (state.selectedTask.value === null) {
    return h("section", { class: "pm-card pm-subcard" }, [
      renderStatusMessage("Select a task to inspect its summary.")
    ]);
  }
  return h("section", { class: "pm-card pm-subcard" }, [
    h("div", { class: "pm-stack" }, [
      h("div", { class: "pm-badge-row" }, [
        h("span", { class: "pm-badge" }, state.selectedTask.value.status),
        h("p", { class: "pm-kicker" }, state.selectedTask.value.createdAt)
      ]),
      h("p", { class: "pm-copy" }, state.selectedTask.value.taskSlug),
      state.selectedTask.value.appliedAt
        ? h("p", { class: "pm-copy" }, `Applied at ${state.selectedTask.value.appliedAt}`)
        : null,
      renderAiTaskChanges(state)
    ])
  ]);
}
function renderAiTaskChanges(state: AiState): VNode {
  if (state.summary.value === null) {
    return renderStatusMessage("No summary artifact yet.");
  }
  return h(
    "ul",
    { class: "pm-list" },
    state.summary.value.changes.length === 0
      ? [h("li", { class: "pm-focus-item" }, "No changed files in the summary artifact.")]
      : state.summary.value.changes.map((change) =>
          h("li", { class: "pm-focus-item" }, `${change.kind} · ${change.path}`)
        )
  );
}
function renderAiView(
  projectSlug: string,
  adminToken: string,
  setAdminToken: (value: string) => void,
  state: AiState
): VNode {
  return h("div", { class: "pm-view", "data-view": "ai" }, [
    renderPageHeader(
      projectSlug,
      "ai",
      "Repository AI tasks",
      "Review queued and completed AI tasks here, then apply a completed task when the summary is ready."
    ),
    h("section", { class: "pm-card pm-stack" }, [
      h("div", { class: "pm-page-copy" }, [
        h("h2", { class: "pm-section-title" }, "Task queue"),
        h("p", { class: "pm-copy" }, "The left column is the queue. The right column is the selected task summary.")
      ]),
      state.error.value ? renderStatusMessage(state.error.value, "error") : null,
      renderAiBody(state)
    ]),
    renderAiWriteActions({
      adminToken,
      composeOpen: state.composeOpen.value,
      taskSlug: state.taskSlug.value,
      prompt: state.prompt.value,
      isBusy: state.isBusy.value,
      canApplySelectedTask: state.selectedTask.value?.status === "completed",
      setAdminToken: (value) => {
        setAdminToken(value);
      },
      setTaskSlug: (value) => {
        state.taskSlug.value = value;
      },
      setPrompt: (value) => {
        state.prompt.value = value;
      },
      toggleComposer: () => {
        state.composeOpen.value = !state.composeOpen.value;
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
    const state = createAiState(projectSlug, adminToken);

    onMounted(() => {
      void state.refreshTasks();
    });
    watch(projectSlug, () => {
      state.reset();
      void state.refreshTasks();
    });

    return () =>
      renderAiView(projectSlug.value, context.adminToken, (value) => {
        context.setAdminToken(value);
      }, state);
  }
});
