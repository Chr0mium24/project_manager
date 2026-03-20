import {
  computed,
  defineComponent,
  h,
  onMounted,
  ref,
  watch,
  type ComputedRef,
  type Ref,
  type VNode
} from "vue";
import { useRoute } from "vue-router";
import {
  GatewayProjectApiClient,
  type ProjectFileTreeDirectoryNode,
  type ProjectFileTreeNode
} from "../gateway-api.ts";
import { useProjectContextStore } from "./project-context-store.ts";
import {
  type ProjectManagerMetric,
  renderPageHeader,
  renderMetricGrid,
  renderSectionHeader,
  renderStatusMessage,
  renderWriteAccessCard
} from "./project-manager-view-shared.ts";

const client = new GatewayProjectApiClient();

interface WorkspaceState {
  tree: Ref<ProjectFileTreeDirectoryNode | null>;
  selectedFilePath: Ref<string>;
  fileContent: Ref<string | null>;
  fileDraft: Ref<string>;
  isLoading: Ref<boolean>;
  isSaving: Ref<boolean>;
  error: Ref<string | null>;
  navOpen: Ref<boolean>;
  isDirty: ComputedRef<boolean>;
  loadWorkspace(slug: string): Promise<void>;
  loadFile(filePath: string): Promise<void>;
  saveFile(): Promise<void>;
}

interface WorkspaceActionContext {
  projectSlug: ComputedRef<string>;
  adminToken: ComputedRef<string>;
  tree: Ref<ProjectFileTreeDirectoryNode | null>;
  selectedFilePath: Ref<string>;
  fileContent: Ref<string | null>;
  fileDraft: Ref<string>;
  isLoading: Ref<boolean>;
  isSaving: Ref<boolean>;
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

function createWorkspaceActions(context: WorkspaceActionContext) {
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
  async function loadWorkspace(slug: string) {
    if (!slug) {
      return;
    }
    context.isLoading.value = true;
    context.error.value = null;
    context.tree.value = null;
    try {
      const nextTree = await client.readProjectFileTree(slug);
      context.tree.value = nextTree;
      const nextFilePath = firstFilePath(nextTree);
      if (nextFilePath) {
        await loadFile(nextFilePath);
      } else {
        context.selectedFilePath.value = "";
        context.fileContent.value = "";
        context.fileDraft.value = "";
      }
    } catch (loadError) {
      context.error.value = loadError instanceof Error ? loadError.message : "unknown workspace error";
    } finally {
      context.isLoading.value = false;
    }
  }
  async function saveFile() {
    if (!context.projectSlug.value || !context.selectedFilePath.value) {
      return;
    }
    if (context.adminToken.value.length === 0) {
      context.error.value = "Admin token is required for file writes.";
      return;
    }
    context.isSaving.value = true;
    context.error.value = null;
    try {
      await client.writeProjectFile(
        context.projectSlug.value,
        context.selectedFilePath.value,
        context.fileDraft.value,
        context.adminToken.value
      );
      context.fileContent.value = context.fileDraft.value;
    } catch (saveError) {
      context.error.value = saveError instanceof Error ? saveError.message : "unknown project file error";
    } finally {
      context.isSaving.value = false;
    }
  }

  return {
    loadWorkspace,
    loadFile,
    saveFile
  };
}

function createWorkspaceState(projectSlug: ComputedRef<string>, adminToken: ComputedRef<string>): WorkspaceState {
  const tree = ref<ProjectFileTreeDirectoryNode | null>(null);
  const selectedFilePath = ref("");
  const fileContent = ref<string | null>(null);
  const fileDraft = ref("");
  const isLoading = ref(false);
  const isSaving = ref(false);
  const error = ref<string | null>(null);
  const navOpen = ref(true);
  const isDirty = computed(() => fileContent.value !== null && fileDraft.value !== fileContent.value);
  const actions = createWorkspaceActions({
    projectSlug,
    adminToken,
    tree,
    selectedFilePath,
    fileContent,
    fileDraft,
    isLoading,
    isSaving,
    error
  });

  return {
    tree,
    selectedFilePath,
    fileContent,
    fileDraft,
    isLoading,
    isSaving,
    error,
    navOpen,
    isDirty,
    loadWorkspace: actions.loadWorkspace,
    loadFile: actions.loadFile,
    saveFile: actions.saveFile
  };
}

function renderTree(
  node: ProjectFileTreeNode,
  selectedFilePath: string,
  onSelect: (filePath: string) => void
): VNode {
  if (node.kind === "file") {
    return h("li", [
      h(
        "button",
        {
          type: "button",
          class: ["pm-tree-button", selectedFilePath === node.path ? "is-active" : ""],
          onClick: () => {
            onSelect(node.path);
          }
        },
        [h("span", node.name), h("small", `${String(node.size)}b`)]
      )
    ]);
  }

  return h("li", [
    h("div", { class: "pm-tree-dir" }, node.path.length === 0 ? "workspace" : node.name),
    h(
      "ul",
      { class: "pm-tree-list" },
      node.children.map((child) => renderTree(child, selectedFilePath, onSelect))
    )
  ]);
}

function renderWorkspaceEditor(state: WorkspaceState): VNode {
  if (state.selectedFilePath.value.length === 0) {
    return renderStatusMessage("Select a file from the tree to inspect its contents.");
  }
  if (state.fileContent.value === null) {
    return renderStatusMessage("Loading file...");
  }
  return h("div", { class: "pm-editor-stack" }, [
    h("textarea", {
      class: "pm-textarea pm-editor",
      value: state.fileDraft.value,
      spellcheck: false,
      onInput: (event: Event) => {
        state.fileDraft.value = (event.target as HTMLTextAreaElement).value;
      }
    }),
    h("div", { class: "pm-actions pm-actions-end" }, [
      h(
        "button",
        {
          type: "button",
          class: "pm-button",
          disabled: state.isSaving.value || !state.isDirty.value,
          onClick: () => {
            void state.saveFile();
          }
        },
        state.isSaving.value ? "Saving..." : "Save File"
      )
    ])
  ]);
}

function renderWorkspaceBody(state: WorkspaceState): VNode {
  if (state.isLoading.value) {
    return renderStatusMessage("Loading workspace...");
  }

  return h("div", { class: ["pm-workspace-grid", state.navOpen.value ? "" : "is-focused"] }, [
    state.navOpen.value
      ? h("aside", { class: "pm-card pm-subcard pm-workspace-nav" }, [
          state.tree.value === null
            ? renderStatusMessage("No workspace tree available.")
            : h("ul", { class: "pm-tree-list" }, [
                ...state.tree.value.children.map((node) =>
                  renderTree(node, state.selectedFilePath.value, (filePath) => {
                    void state.loadFile(filePath);
                  })
                )
              ])
        ])
      : null,
    h("section", { class: "pm-card pm-subcard pm-editor-shell" }, [renderWorkspaceEditor(state)])
  ]);
}

function workspaceMetrics(state: WorkspaceState): ProjectManagerMetric[] {
  return [
    {
      label: "Current file",
      value: state.selectedFilePath.value || "No file selected"
    },
    {
      label: "Editor state",
      value: state.isDirty.value ? "Unsaved changes" : "Saved"
    },
    {
      label: "Layout",
      value: state.navOpen.value ? "Browser open" : "Focused"
    }
  ];
}

function renderWorkspaceView(
  projectSlug: string,
  adminToken: string,
  setAdminToken: (value: string) => void,
  state: WorkspaceState
): VNode {
  return h("div", { class: "pm-view", "data-view": "workspace" }, [
    renderPageHeader(
      projectSlug,
      "workspace",
      "Repository workspace",
      "Browse repository files, edit the selected file, and save changes back to the managed project."
    ),
    renderMetricGrid(workspaceMetrics(state)),
    h("div", { class: "pm-column-grid" }, [
      h("section", { class: "pm-card pm-workspace-card" }, [
        renderSectionHeader(
          "Files",
          state.selectedFilePath.value
            ? `Editing ${state.selectedFilePath.value}`
            : "Choose a file from the repository tree, then edit it in the main panel.",
          h(
            "button",
            {
              type: "button",
              class: "pm-button pm-button-ghost",
              onClick: () => {
                state.navOpen.value = !state.navOpen.value;
              }
            },
            state.navOpen.value ? "Hide tree" : "Show tree"
          )
        ),
        state.error.value ? renderStatusMessage(state.error.value, "error") : null,
        renderWorkspaceBody(state)
      ]),
      renderWriteAccessCard(
        adminToken,
        (value) => {
          setAdminToken(value);
        },
        "Only required when you want to save the current file back to the repository."
      )
    ])
  ]);
}

export const ProjectWorkspaceView = defineComponent({
  name: "ProjectWorkspaceView",
  setup() {
    const route = useRoute();
    const context = useProjectContextStore();
    const projectSlug = computed(() => String(route.params.slug ?? ""));
    const adminToken = computed(() => context.adminToken.trim());
    const state = createWorkspaceState(projectSlug, adminToken);

    onMounted(() => {
      void state.loadWorkspace(projectSlug.value);
    });
    watch(projectSlug, (slug) => {
      void state.loadWorkspace(slug);
    });

    return () =>
      renderWorkspaceView(projectSlug.value, context.adminToken, (value) => {
        context.setAdminToken(value);
      }, state);
  }
});
