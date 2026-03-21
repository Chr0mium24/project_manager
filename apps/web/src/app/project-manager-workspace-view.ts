import {
  computed,
  defineComponent,
  onMounted,
  ref,
  watch,
  type ComputedRef,
  type Ref
} from "vue";
import { useRoute } from "vue-router";
import {
  GatewayProjectApiClient,
  type ProjectFileMutationResult,
  type ProjectFileTreeDirectoryNode,
  type ProjectFileTreeNode
} from "../gateway-api.ts";
import { useProjectContextStore } from "./project-context-store.ts";
import { runtimeHrefForSlug } from "./project-runtime-link.ts";
import { renderWorkspaceView } from "./project-manager-workspace-render.ts";

const client = new GatewayProjectApiClient();

interface WorkspaceState {
  tree: Ref<ProjectFileTreeDirectoryNode | null>;
  selectedFilePath: Ref<string>;
  newFilePath: Ref<string>;
  fileContent: Ref<string | null>;
  fileDraft: Ref<string>;
  lastMutation: Ref<ProjectFileMutationResult | null>;
  isLoading: Ref<boolean>;
  isSaving: Ref<boolean>;
  isCreating: Ref<boolean>;
  isDeleting: Ref<boolean>;
  error: Ref<string | null>;
  navOpen: Ref<boolean>;
  editorError: Ref<string | null>;
  isDirty: ComputedRef<boolean>;
  loadWorkspace(slug: string): Promise<void>;
  loadFile(filePath: string): Promise<void>;
  createFile(): Promise<void>;
  deleteFile(): Promise<void>;
  saveFile(): Promise<void>;
}

interface WorkspaceActionContext {
  projectSlug: ComputedRef<string>;
  adminToken: ComputedRef<string>;
  tree: Ref<ProjectFileTreeDirectoryNode | null>;
  selectedFilePath: Ref<string>;
  newFilePath: Ref<string>;
  fileContent: Ref<string | null>;
  fileDraft: Ref<string>;
  lastMutation: Ref<ProjectFileMutationResult | null>;
  isLoading: Ref<boolean>;
  isSaving: Ref<boolean>;
  isCreating: Ref<boolean>;
  isDeleting: Ref<boolean>;
  error: Ref<string | null>;
}

function firstFilePath(node: ProjectFileTreeNode | null): string {
  if (node === null) {
    return "";
  }
  if (node.kind === "file") {
    return node.path;
  }
  for (const child of node.children) {
    const nextPath = firstFilePath(child);
    if (nextPath) {
      return nextPath;
    }
  }
  return "";
}

function hasFilePath(node: ProjectFileTreeNode | null, filePath: string): boolean {
  if (node === null) {
    return false;
  }
  if (node.kind === "file") {
    return node.path === filePath;
  }
  return node.children.some((child) => hasFilePath(child, filePath));
}

function requireAdminToken(adminToken: string): string {
  if (adminToken.length === 0) {
    throw new Error("Admin access is required for file writes. Open Admin access from the header.");
  }

  return adminToken;
}

function createWorkspaceQueries(context: WorkspaceActionContext) {
  async function loadFile(filePath: string) {
    if (!context.projectSlug.value || !filePath) {
      return;
    }
    context.selectedFilePath.value = filePath;
    context.fileContent.value = null;
    context.fileDraft.value = "";
    context.error.value = null;
    try {
      const content = await client.readProjectFile(context.projectSlug.value, filePath);
      context.fileContent.value = content;
      context.fileDraft.value = content;
    } catch (loadError) {
      context.error.value = loadError instanceof Error ? loadError.message : "unknown project file error";
    }
  }

  async function refreshTree(preferredPath: string): Promise<void> {
    const nextTree = await client.readProjectFileTree(context.projectSlug.value);
    context.tree.value = nextTree;
    const nextSelectedPath = hasFilePath(nextTree, preferredPath) ? preferredPath : firstFilePath(nextTree);
    context.selectedFilePath.value = nextSelectedPath;
  }

  async function loadWorkspace(slug: string) {
    if (!slug) {
      return;
    }
    context.isLoading.value = true;
    context.error.value = null;
    context.tree.value = null;
    try {
      await refreshTree(context.selectedFilePath.value);
      if (context.selectedFilePath.value) {
        await loadFile(context.selectedFilePath.value);
      } else {
        context.fileContent.value = "";
        context.fileDraft.value = "";
      }
    } catch (loadError) {
      context.error.value = loadError instanceof Error ? loadError.message : "unknown workspace error";
    } finally {
      context.isLoading.value = false;
    }
  }

  return { loadFile, loadWorkspace, refreshTree };
}

function createWorkspaceMutations(
  context: WorkspaceActionContext,
  queries: ReturnType<typeof createWorkspaceQueries>
) {
  async function createFile() {
    if (!context.projectSlug.value || context.newFilePath.value.trim().length === 0) {
      return;
    }
    context.isCreating.value = true;
    context.error.value = null;
    try {
      const adminToken = requireAdminToken(context.adminToken.value);
      const filePath = context.newFilePath.value.trim();
      await client.writeProjectFile({
        slug: context.projectSlug.value,
        filePath,
        content: "",
        adminToken
      });
      context.newFilePath.value = "";
      await queries.refreshTree(filePath);
      await queries.loadFile(filePath);
      context.lastMutation.value = null;
    } catch (error) {
      context.error.value = error instanceof Error ? error.message : "unknown project file error";
    } finally {
      context.isCreating.value = false;
    }
  }

  async function deleteFile() {
    if (!context.projectSlug.value || context.selectedFilePath.value.length === 0) {
      return;
    }
    context.isDeleting.value = true;
    context.error.value = null;
    try {
      const adminToken = requireAdminToken(context.adminToken.value);
      const deletedPath = context.selectedFilePath.value;
      context.lastMutation.value = await client.deleteProjectFile(context.projectSlug.value, deletedPath, adminToken);
      await queries.refreshTree("");
      if (context.selectedFilePath.value.length > 0) {
        await queries.loadFile(context.selectedFilePath.value);
      } else {
        context.fileContent.value = "";
        context.fileDraft.value = "";
      }
    } catch (error) {
      context.error.value = error instanceof Error ? error.message : "unknown project file error";
    } finally {
      context.isDeleting.value = false;
    }
  }

  async function saveFile() {
    if (!context.projectSlug.value || !context.selectedFilePath.value) {
      return;
    }
    context.isSaving.value = true;
    context.error.value = null;
    try {
      const adminToken = requireAdminToken(context.adminToken.value);
      context.lastMutation.value = await client.writeProjectFile({
        slug: context.projectSlug.value,
        filePath: context.selectedFilePath.value,
        content: context.fileDraft.value,
        adminToken,
        runChecks: true
      });
      context.fileContent.value = context.fileDraft.value;
      await queries.refreshTree(context.selectedFilePath.value);
    } catch (saveError) {
      context.error.value = saveError instanceof Error ? saveError.message : "unknown project file error";
    } finally {
      context.isSaving.value = false;
    }
  }

  return { createFile, deleteFile, saveFile };
}

function createWorkspaceState(projectSlug: ComputedRef<string>, adminToken: ComputedRef<string>): WorkspaceState {
  const tree = ref<ProjectFileTreeDirectoryNode | null>(null);
  const selectedFilePath = ref("");
  const newFilePath = ref("");
  const fileContent = ref<string | null>(null);
  const fileDraft = ref("");
  const lastMutation = ref<ProjectFileMutationResult | null>(null);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const isCreating = ref(false);
  const isDeleting = ref(false);
  const error = ref<string | null>(null);
  const navOpen = ref(true);
  const editorError = ref<string | null>(null);
  const isDirty = computed(() => fileContent.value !== null && fileDraft.value !== fileContent.value);
  const queries = createWorkspaceQueries({
    projectSlug,
    adminToken,
    tree,
    selectedFilePath,
    newFilePath,
    fileContent,
    fileDraft,
    lastMutation,
    isLoading,
    isSaving,
    isCreating,
    isDeleting,
    error
  });
  const mutations = createWorkspaceMutations({
    projectSlug,
    adminToken,
    tree,
    selectedFilePath,
    newFilePath,
    fileContent,
    fileDraft,
    lastMutation,
    isLoading,
    isSaving,
    isCreating,
    isDeleting,
    error
  }, queries);

  return {
    tree,
    selectedFilePath,
    newFilePath,
    fileContent,
    fileDraft,
    lastMutation,
    isLoading,
    isSaving,
    isCreating,
    isDeleting,
    error,
    navOpen,
    editorError,
    isDirty,
    loadWorkspace: queries.loadWorkspace,
    loadFile: queries.loadFile,
    createFile: mutations.createFile,
    deleteFile: mutations.deleteFile,
    saveFile: mutations.saveFile
  };
}

export const ProjectWorkspaceView = defineComponent({
  name: "ProjectWorkspaceView",
  setup() {
    const route = useRoute();
    const context = useProjectContextStore();
    const projectSlug = computed(() => String(route.params.slug ?? ""));
    const adminToken = computed(() => context.adminToken.trim());
    const publicHref = computed(() => runtimeHrefForSlug(context.projects, projectSlug.value));
    const state = createWorkspaceState(projectSlug, adminToken);

    onMounted(() => {
      void state.loadWorkspace(projectSlug.value);
    });
    watch(projectSlug, (slug) => {
      void state.loadWorkspace(slug);
    });

    return () => renderWorkspaceView({
      editorError: state.editorError.value,
      error: state.error.value,
      fileContent: state.fileContent.value,
      fileDraft: state.fileDraft.value,
      isCreating: state.isCreating.value,
      isDeleting: state.isDeleting.value,
      isDirty: state.isDirty.value,
      isLoading: state.isLoading.value,
      isSaving: state.isSaving.value,
      lastMutation: state.lastMutation.value,
      navOpen: state.navOpen.value,
      newFilePath: state.newFilePath.value,
      projectSlug: projectSlug.value,
      publicHref: publicHref.value,
      selectedFilePath: state.selectedFilePath.value,
      tree: state.tree.value,
      createFile: () => {
        void state.createFile();
      },
      deleteFile: () => {
        void state.deleteFile();
      },
      loadFile: (filePath) => {
        void state.loadFile(filePath);
      },
      saveFile: () => {
        void state.saveFile();
      },
      setEditorDraft: (value) => {
        state.fileDraft.value = value;
      },
      setEditorError: (message) => {
        state.editorError.value = message;
      },
      setNavOpen: (value) => {
        state.navOpen.value = value;
      },
      setNewFilePath: (value) => {
        state.newFilePath.value = value;
      }
    });
  }
});
