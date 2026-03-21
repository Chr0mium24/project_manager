import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch, type ComputedRef, type Ref } from "vue";
import { useRoute } from "vue-router";
import {
  AiTaskApiClient,
  type AiTaskSandboxMode,
  type AiTaskRecord,
  type AiTaskDiagnostics,
  type ManagedTaskSummary
} from "../ai-task-api.ts";
import { useProjectContextStore } from "./project-context-store.ts";
import { renderAiView } from "./project-manager-ai-render.ts";
import { runtimeHrefForSlug } from "./project-runtime-link.ts";
import { createAiComposerControls } from "./project-manager-ai-composer-controls.ts";
import { findAiTaskSession } from "./project-manager-ai-sessions.ts";

interface AiState {
  tasks: Ref<AiTaskRecord[]>;
  selectedTask: Ref<AiTaskRecord | null>;
  summary: Ref<ManagedTaskSummary | null>;
  diagnostics: Ref<AiTaskDiagnostics | null>;
  summariesByTaskId: Ref<Record<string, ManagedTaskSummary | null | undefined>>;
  diagnosticsByTaskId: Ref<Record<string, AiTaskDiagnostics | null | undefined>>;
  error: Ref<string | null>;
  isBusy: Ref<boolean>;
  composeOpen: Ref<boolean>;
  taskSlug: Ref<string>;
  prompt: Ref<string>;
  sandboxMode: Ref<AiTaskSandboxMode>;
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
  summariesByTaskId: Ref<Record<string, ManagedTaskSummary | null | undefined>>;
  diagnosticsByTaskId: Ref<Record<string, AiTaskDiagnostics | null | undefined>>;
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
  sandboxMode: Ref<AiTaskSandboxMode>;
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

function replaceTask(tasks: AiTaskRecord[], nextTask: AiTaskRecord): AiTaskRecord[] {
  const index = tasks.findIndex((task) => task.taskId === nextTask.taskId);
  if (index === -1) {
    return [...tasks, nextTask];
  }

  return tasks.map((task) => task.taskId === nextTask.taskId ? nextTask : task);
}

function createAiQueries(context: AiQueryContext) {
  async function loadTaskArtifacts(task: AiTaskRecord) {
    const client = createClient(context.adminToken.value);
    const diagnostics = await client.readDiagnostics(task.taskId);
    const summary = task.summaryPath === null ? null : await client.readSummary(task.taskId);

    context.diagnosticsByTaskId.value = {
      ...context.diagnosticsByTaskId.value,
      [task.taskId]: diagnostics
    };
    context.summariesByTaskId.value = {
      ...context.summariesByTaskId.value,
      [task.taskId]: summary
    };

    if (context.selectedTask.value?.taskId === task.taskId) {
      context.diagnostics.value = diagnostics;
      context.summary.value = summary;
    }
  }

  async function hydrateSelectedSession(task: AiTaskRecord) {
    const session = findAiTaskSession(context.tasks.value, task.taskId);
    if (session === null) {
      return;
    }

    for (const sessionTask of session.tasks) {
      const needsRefresh = sessionTask.status === "queued"
        || sessionTask.status === "running"
        || context.diagnosticsByTaskId.value[sessionTask.taskId] === undefined
        || (sessionTask.summaryPath !== null && context.summariesByTaskId.value[sessionTask.taskId] === undefined);
      if (!needsRefresh) {
        continue;
      }

      await loadTaskArtifacts(sessionTask);
    }
  }

  async function selectTask(taskId: string) {
    if (!taskId) {
      return;
    }

    try {
      context.error.value = null;
      context.summary.value = null;
      context.diagnostics.value = null;
      const client = createClient(context.adminToken.value);
      const task = context.tasks.value.find((entry) => entry.taskId === taskId) ?? await client.readTask(taskId);
      context.tasks.value = replaceTask(context.tasks.value, task);
      context.selectedTask.value = task;
      await loadTaskArtifacts(task);
      await hydrateSelectedSession(task);
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
        prompt: context.prompt.value.trim(),
        sandboxMode: context.sandboxMode.value
      };
      const created = await client.createTask({
        ...input,
        ...(context.parentTaskId.value === null ? {} : { parentTaskId: context.parentTaskId.value })
      });
      context.taskSlug.value = "";
      context.prompt.value = "";
      context.parentTaskId.value = null;
      context.composeOpen.value = false;
      await context.queries.refreshTasks();
      await context.queries.selectTask(created.taskId);
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
  const summariesByTaskId = ref<Record<string, ManagedTaskSummary | null | undefined>>({});
  const diagnosticsByTaskId = ref<Record<string, AiTaskDiagnostics | null | undefined>>({});
  const error = ref<string | null>(null);
  const isBusy = ref(false);
  const composeOpen = ref(false);
  const taskSlug = ref("");
  const prompt = ref("");
  const sandboxMode = ref<AiTaskSandboxMode>("workspace-write");
  const parentTaskId = ref<string | null>(null);
  const queries = createAiQueries({
    projectSlug,
    adminToken,
    tasks,
    selectedTask,
    summary,
    diagnostics,
    summariesByTaskId,
    diagnosticsByTaskId,
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
    sandboxMode,
    parentTaskId,
    queries
  });
  const composerControls = createAiComposerControls({
    composeOpen,
    diagnostics,
    error,
    isBusy,
    parentTaskId,
    prompt,
    sandboxMode,
    selectedTask,
    summary,
    taskSlug,
    tasks
  });
  function reset() {
    summariesByTaskId.value = {};
    diagnosticsByTaskId.value = {};
    composerControls.reset();
  }

  return {
    tasks,
    selectedTask,
    summary,
    diagnostics,
    summariesByTaskId,
    diagnosticsByTaskId,
    error,
    isBusy,
    composeOpen,
    taskSlug,
    prompt,
    sandboxMode,
    parentTaskId,
    refreshTasks: queries.refreshTasks,
    selectTask: queries.selectTask,
    createTask: mutations.createTask,
    applySelectedTask: mutations.applySelectedTask,
    openNewTaskComposer: composerControls.openNewTaskComposer,
    openFollowUpComposer: composerControls.openFollowUpComposer,
    reset
  };
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
    let pollHandle: number | null = null;

    function stopPolling() {
      if (pollHandle !== null) {
        window.clearInterval(pollHandle);
        pollHandle = null;
      }
    }

    function startPolling() {
      if (pollHandle !== null) {
        return;
      }

      pollHandle = window.setInterval(() => {
        const hasPendingTasks = state.tasks.value.some((task) => task.status === "queued" || task.status === "running");
        const selectedTaskPending = state.selectedTask.value?.status === "queued" || state.selectedTask.value?.status === "running";
        if (!hasPendingTasks && !selectedTaskPending) {
          return;
        }

        void refreshFromRoute();
      }, 1_000);
    }

    async function refreshFromRoute() {
      await state.refreshTasks();
      const taskId = typeof route.query.taskId === "string" ? route.query.taskId : "";
      if (taskId.length > 0) {
        await state.selectTask(taskId);
      }
      if (route.query.compose === "follow-up") {
        state.openFollowUpComposer();
      }
    }

    onMounted(() => {
      startPolling();
      void refreshFromRoute();
    });
    onBeforeUnmount(() => {
      stopPolling();
    });
    watch(() => [projectSlug.value, route.query.taskId, route.query.compose], () => {
      state.reset();
      void refreshFromRoute();
    });

    return () => renderAiView(projectSlug.value, state, publicHref.value);
  }
});
