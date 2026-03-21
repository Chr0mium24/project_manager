import { computed, defineComponent, onMounted, onUnmounted, ref, watch, type ComputedRef, type Ref } from "vue";
import { useRouter } from "vue-router";
import { AiTaskApiClient, type AiTaskRecord } from "../ai-task-api.ts";
import { GatewayProjectApiClient, type ManagedProjectRecord, type ProjectCreateInput } from "../gateway-api.ts";
import { useProjectContextStore } from "./project-context-store.ts";
import { renderProjectsIndexView } from "./project-manager-projects-render.ts";

const client = new GatewayProjectApiClient();

interface ProjectsState {
  actionError: Ref<string | null>;
  createBusy: Ref<boolean>;
  createForm: Ref<ProjectCreateInput>;
  deleteBusySlug: Ref<string | null>;
  filteredProjects: ComputedRef<ReturnType<typeof useProjectContextStore>["projects"]>;
  projectDetails: Ref<Record<string, ManagedProjectRecord>>;
  runningTasks: Ref<AiTaskRecord[]>;
  searchQuery: Ref<string>;
  taskError: Ref<string | null>;
  tasksLoading: Ref<boolean>;
}

function createInitialProjectForm(): ProjectCreateInput {
  return {
    slug: "",
    name: "",
    runtime: "static",
    visibility: "public",
    description: "",
    aiPrompt: "",
    aiTaskSlug: "init",
    sandboxMode: "workspace-write",
    runChecks: true
  };
}

async function readProjectDetails(slugs: string[]): Promise<Record<string, ManagedProjectRecord>> {
  const details = await Promise.all(slugs.map(async (slug) => {
    try {
      return await client.readProject(slug);
    } catch {
      return null;
    }
  }));

  return details
    .filter((detail): detail is ManagedProjectRecord => detail !== null)
    .reduce<Record<string, ManagedProjectRecord>>((allDetails, detail) => {
      allDetails[detail.slug] = detail;
      return allDetails;
    }, {});
}

function matchesProject(
  project: ReturnType<typeof useProjectContextStore>["projects"][number],
  detail: ManagedProjectRecord | null,
  searchQuery: string
): boolean {
  if (searchQuery.length === 0) {
    return true;
  }

  const searchTarget = [project.slug, detail?.name ?? "", detail?.description ?? "", project.route].join(" ").toLowerCase();
  return searchTarget.includes(searchQuery);
}

function createProjectsState(context: ReturnType<typeof useProjectContextStore>): ProjectsState {
  const projectDetails = ref<Record<string, ManagedProjectRecord>>({});
  const searchQuery = ref("");
  const createBusy = ref(false);
  const deleteBusySlug = ref<string | null>(null);
  const actionError = ref<string | null>(null);
  const taskError = ref<string | null>(null);
  const tasksLoading = ref(false);
  const runningTasks = ref<AiTaskRecord[]>([]);
  const createForm = ref<ProjectCreateInput>(createInitialProjectForm());
  const filteredProjects = computed(() => {
    const normalizedQuery = searchQuery.value.trim().toLowerCase();
    return context.projects.filter((project) =>
      matchesProject(project, projectDetails.value[project.slug] ?? null, normalizedQuery)
    );
  });

  return {
    actionError,
    createBusy,
    createForm,
    deleteBusySlug,
    filteredProjects,
    projectDetails,
    runningTasks,
    searchQuery,
    taskError,
    tasksLoading
  };
}

function buildCreateProjectPayload(form: ProjectCreateInput): ProjectCreateInput {
  return {
    ...form,
    slug: form.slug.trim(),
    name: form.name.trim(),
    ...(form.description?.trim() ? { description: form.description.trim() } : {}),
    ...(form.aiPrompt?.trim() ? { aiPrompt: form.aiPrompt.trim() } : {}),
    ...(form.aiTaskSlug?.trim() ? { aiTaskSlug: form.aiTaskSlug.trim() } : {})
  };
}

function createTaskPolling(
  adminMode: ComputedRef<boolean>,
  loadRunningTasks: () => Promise<void>
) {
  let taskPollHandle: number | null = null;

  function startTaskPolling() {
    if (taskPollHandle !== null || !adminMode.value) {
      return;
    }

    taskPollHandle = window.setInterval(() => {
      void loadRunningTasks();
    }, 3_000);
  }

  function stopTaskPolling() {
    if (taskPollHandle !== null) {
      window.clearInterval(taskPollHandle);
      taskPollHandle = null;
    }
  }

  return { startTaskPolling, stopTaskPolling };
}

function createProjectsActions(
  router: ReturnType<typeof useRouter>,
  context: ReturnType<typeof useProjectContextStore>,
  adminMode: ComputedRef<boolean>,
  state: ProjectsState
) {
  async function loadProjectDetails() {
    state.projectDetails.value = await readProjectDetails(context.projects.map((project) => project.slug));
  }
  async function loadRunningTasks() {
    if (!adminMode.value) {
      state.runningTasks.value = [];
      state.taskError.value = null;
      return;
    }

    state.tasksLoading.value = true;
    try {
      const tasks = await new AiTaskApiClient({ adminToken: context.adminToken.trim() }).listTasks();
      state.runningTasks.value = tasks.filter((task) => task.status === "queued" || task.status === "running");
      state.taskError.value = null;
    } catch (error) {
      state.taskError.value = error instanceof Error ? error.message : "Unable to load running AI tasks.";
    } finally {
      state.tasksLoading.value = false;
    }
  }
  const polling = createTaskPolling(adminMode, loadRunningTasks);
  async function createProjectFromForm() {
    const adminToken = context.adminToken.trim();
    if (adminToken.length === 0) {
      state.actionError.value = "Admin access is required for project creation.";
      return;
    }

    state.createBusy.value = true;
    state.actionError.value = null;
    try {
      const created = await client.createProject(buildCreateProjectPayload(state.createForm.value), adminToken);
      await context.loadProjects();
      await Promise.all([loadProjectDetails(), loadRunningTasks()]);
      state.createForm.value = createInitialProjectForm();
      await router.push(created.task === null
        ? `/projects/${created.project.slug}`
        : `/projects/${created.project.slug}/ai?taskId=${encodeURIComponent(created.task.taskId)}`);
    } catch (error) {
      state.actionError.value = error instanceof Error ? error.message : "Unable to create project.";
    } finally {
      state.createBusy.value = false;
    }
  }

  async function deleteProject(slug: string) {
    const adminToken = context.adminToken.trim();
    if (adminToken.length === 0) {
      state.actionError.value = "Admin access is required for project deletion.";
      return;
    }
    if (typeof window !== "undefined" && !window.confirm(`Delete project ${slug}?`)) {
      return;
    }

    state.deleteBusySlug.value = slug;
    state.actionError.value = null;
    try {
      await client.deleteProject(slug, adminToken);
      await context.loadProjects();
      await Promise.all([loadProjectDetails(), loadRunningTasks()]);
    } catch (error) {
      state.actionError.value = error instanceof Error ? error.message : "Unable to delete project.";
    } finally {
      state.deleteBusySlug.value = null;
    }
  }
  return {
    createProjectFromForm,
    deleteProject,
    loadProjectDetails,
    loadRunningTasks,
    startTaskPolling: polling.startTaskPolling,
    stopTaskPolling: polling.stopTaskPolling
  };
}

export const ProjectsIndexView = defineComponent({
  name: "ProjectsIndexView",
  setup() {
    const router = useRouter();
    const context = useProjectContextStore();
    const adminMode = computed(() => context.adminToken.trim().length > 0);
    const state = createProjectsState(context);
    const actions = createProjectsActions(router, context, adminMode, state);

    onMounted(() => {
      void (async () => {
        if (context.projects.length === 0 && !context.projectsLoading) {
          await context.loadProjects();
        }
        await actions.loadProjectDetails();
        await actions.loadRunningTasks();
        actions.startTaskPolling();
      })();
    });

    onUnmounted(() => {
      actions.stopTaskPolling();
    });

    watch(() => context.projects, () => {
      void actions.loadProjectDetails();
    });

    watch(adminMode, (enabled) => {
      if (enabled) {
        void actions.loadRunningTasks();
        actions.startTaskPolling();
        return;
      }

      actions.stopTaskPolling();
      state.runningTasks.value = [];
    });

    return () => renderProjectsIndexView({
      actionError: state.actionError.value,
      adminMode: adminMode.value,
      createBusy: state.createBusy.value,
      createForm: state.createForm.value,
      deleteBusySlug: state.deleteBusySlug.value,
      filteredProjects: state.filteredProjects.value,
      projectDetails: state.projectDetails.value,
      projectsError: context.projectsError,
      projectsLoading: context.projectsLoading,
      runningTasks: state.runningTasks.value,
      searchQuery: state.searchQuery.value,
      taskError: state.taskError.value,
      tasksLoading: state.tasksLoading.value,
      onCreateProject: () => {
        void actions.createProjectFromForm();
      },
      onDeleteProject: (slug) => {
        void actions.deleteProject(slug);
      },
      setCreateField: (key, value) => {
        state.createForm.value = {
          ...state.createForm.value,
          [key]: value
        } as ProjectCreateInput;
      },
      setSearchQuery: (value) => {
        state.searchQuery.value = value;
      }
    });
  }
});
