import { computed, defineComponent, h, onMounted, ref, watch, type ComputedRef, type Ref, type VNode } from "vue";
import { useRoute } from "vue-router";
import { GatewayProjectApiClient, type ProjectVersionDiff, type ProjectVersionRecord } from "../gateway-api.ts";
import { useProjectContextStore } from "./project-context-store.ts";
import { type ProjectManagerMetric, renderPageHeader, renderMetricGrid, renderSectionHeader, renderStatusMessage } from "./project-manager-view-shared.ts";

const client = new GatewayProjectApiClient();

interface VersionsState {
  versions: Ref<ProjectVersionRecord[]>;
  selectedVersionId: Ref<string>;
  diff: Ref<ProjectVersionDiff | null>;
  message: Ref<string>;
  error: Ref<string | null>;
  isLoading: Ref<boolean>;
  isBusy: Ref<boolean>;
  composeOpen: Ref<boolean>;
  loadVersions(slug: string): Promise<void>;
  selectVersion(versionId: string): Promise<void>;
  createVersion(): Promise<void>;
  restoreSelectedVersion(): Promise<void>;
}

interface VersionLoaderContext {
  projectSlug: ComputedRef<string>;
  versions: Ref<ProjectVersionRecord[]>;
  selectedVersionId: Ref<string>;
  diff: Ref<ProjectVersionDiff | null>;
  error: Ref<string | null>;
  isLoading: Ref<boolean>;
  composeOpen: Ref<boolean>;
}

interface VersionMutationContext {
  projectSlug: ComputedRef<string>;
  adminToken: ComputedRef<string>;
  selectedVersionId: Ref<string>;
  message: Ref<string>;
  error: Ref<string | null>;
  isBusy: Ref<boolean>;
  composeOpen: Ref<boolean>;
  loaders: ReturnType<typeof createVersionLoaders>;
}

function createVersionLoaders(context: VersionLoaderContext) {
  async function selectVersion(versionId: string) {
    if (!context.projectSlug.value || !versionId) {
      return;
    }
    context.selectedVersionId.value = versionId;
    context.diff.value = null;
    context.error.value = null;
    try {
      context.diff.value = await client.readVersionDiff(context.projectSlug.value, versionId);
    } catch (loadError) {
      context.error.value = loadError instanceof Error ? loadError.message : "unknown project version error";
    }
  }

  async function loadVersions(slug: string) {
    if (!slug) {
      return;
    }
    context.isLoading.value = true;
    context.error.value = null;
    context.versions.value = [];
    context.selectedVersionId.value = "";
    context.diff.value = null;
    try {
      context.versions.value = await client.listVersions(slug);
      context.composeOpen.value = context.versions.value.length === 0;
      const latestVersion = context.versions.value[0]?.versionId ?? "";
      if (latestVersion) {
        await selectVersion(latestVersion);
      }
    } catch (loadError) {
      context.error.value = loadError instanceof Error ? loadError.message : "unknown project version error";
    } finally {
      context.isLoading.value = false;
    }
  }

  return {
    loadVersions,
    selectVersion
  };
}

function createVersionMutations(context: VersionMutationContext) {
  async function createVersion() {
    if (!context.projectSlug.value) {
      return;
    }
    if (context.adminToken.value.length === 0) {
      context.error.value = "Admin token is required for snapshots.";
      return;
    }
    if (context.message.value.trim().length === 0) {
      context.error.value = "Snapshot message is required.";
      return;
    }
    context.isBusy.value = true;
    context.error.value = null;
    try {
      const created = await client.createVersion(
        context.projectSlug.value,
        context.message.value.trim(),
        context.adminToken.value
      );
      context.message.value = "";
      context.composeOpen.value = false;
      await context.loaders.loadVersions(context.projectSlug.value);
      await context.loaders.selectVersion(created.versionId);
    } catch (createError) {
      context.error.value = createError instanceof Error ? createError.message : "unknown project version error";
    } finally {
      context.isBusy.value = false;
    }
  }

  async function restoreSelectedVersion() {
    if (!context.projectSlug.value || !context.selectedVersionId.value) {
      return;
    }
    if (context.adminToken.value.length === 0) {
      context.error.value = "Admin token is required for restore.";
      return;
    }
    context.isBusy.value = true;
    context.error.value = null;
    try {
      const restored = await client.restoreVersion(
        context.projectSlug.value,
        context.selectedVersionId.value,
        context.adminToken.value
      );
      await context.loaders.loadVersions(context.projectSlug.value);
      await context.loaders.selectVersion(restored.versionId);
    } catch (restoreError) {
      context.error.value = restoreError instanceof Error ? restoreError.message : "unknown project version error";
    } finally {
      context.isBusy.value = false;
    }
  }

  return {
    createVersion,
    restoreSelectedVersion
  };
}

function createVersionsState(projectSlug: ComputedRef<string>, adminToken: ComputedRef<string>): VersionsState {
  const versions = ref<ProjectVersionRecord[]>([]);
  const selectedVersionId = ref("");
  const diff = ref<ProjectVersionDiff | null>(null);
  const message = ref("");
  const error = ref<string | null>(null);
  const isLoading = ref(false);
  const isBusy = ref(false);
  const composeOpen = ref(false);
  const loaders = createVersionLoaders({
    projectSlug,
    versions,
    selectedVersionId,
    diff,
    error,
    isLoading,
    composeOpen
  });
  const mutations = createVersionMutations({
    projectSlug,
    adminToken,
    selectedVersionId,
    message,
    error,
    isBusy,
    composeOpen,
    loaders
  });

  return {
    versions,
    selectedVersionId,
    diff,
    message,
    error,
    isLoading,
    isBusy,
    composeOpen,
    loadVersions: loaders.loadVersions,
    selectVersion: loaders.selectVersion,
    createVersion: mutations.createVersion,
    restoreSelectedVersion: mutations.restoreSelectedVersion
  };
}

function renderVersionsComposer(state: VersionsState): VNode | null {
  if (!state.composeOpen.value) {
    return null;
  }
  return h("div", { class: "pm-form-grid" }, [
    h("label", { class: "pm-field" }, [
      h("span", "Snapshot message"),
      h("input", {
        class: "pm-input",
        value: state.message.value,
        onInput: (event: Event) => {
          state.message.value = (event.target as HTMLInputElement).value;
        }
      })
    ]),
    h("div", { class: "pm-actions pm-actions-end" }, [
      h(
        "button",
        {
          type: "button",
          class: "pm-button",
          disabled: state.isBusy.value,
          onClick: () => {
            void state.createVersion();
          }
        },
        state.isBusy.value ? "Saving..." : "Create Snapshot"
      )
    ])
  ]);
}

function renderVersionsBody(state: VersionsState): VNode {
  if (state.isLoading.value) {
    return renderStatusMessage("Loading snapshots...");
  }

  return h("div", { class: "pm-version-grid" }, [
    renderVersionsList(state),
    renderVersionDetail(state)
  ]);
}

function renderVersionsList(state: VersionsState): VNode {
  return h("aside", { class: "pm-card pm-subcard" }, [
    state.versions.value.length === 0
      ? renderStatusMessage("No snapshots yet.")
      : h(
          "ul",
          { class: "pm-list" },
          state.versions.value.map((version) =>
            h("li", [
              h(
                "button",
                {
                  type: "button",
                  class: ["pm-list-button", state.selectedVersionId.value === version.versionId ? "is-active" : ""],
                  onClick: () => {
                    void state.selectVersion(version.versionId);
                  }
                },
                [h("strong", version.message), h("small", version.versionId)]
              )
            ])
          )
        )
  ]);
}

function renderVersionDetail(state: VersionsState): VNode {
  if (state.selectedVersionId.value.length === 0) {
    return h("section", { class: "pm-card pm-subcard" }, [
      renderStatusMessage("Select a snapshot to inspect its diff.")
    ]);
  }
  if (state.diff.value === null) {
    return h("section", { class: "pm-card pm-subcard" }, [renderStatusMessage("Loading diff...")]);
  }
  const selectedVersion = state.versions.value.find((version) => version.versionId === state.selectedVersionId.value) ?? null;

  return h("section", { class: "pm-card pm-subcard" }, [
    h("div", { class: "pm-stack" }, [
      h("div", { class: "pm-badge-row" }, [
        h("span", { class: "pm-badge" }, state.selectedVersionId.value),
        selectedVersion === null ? null : h("p", { class: "pm-kicker" }, selectedVersion.createdAt)
      ]),
      h(
        "p",
        { class: "pm-copy" },
        selectedVersion === null
          ? `${String(state.diff.value.changedFiles)} file changes against current project.`
          : `${selectedVersion.message} · ${String(state.diff.value.changedFiles)} file changes against current project.`
      ),
      h(
        "ul",
        { class: "pm-list" },
        state.diff.value.changes.length === 0
          ? [h("li", { class: "pm-focus-item" }, "No changes against the current project.")]
          : state.diff.value.changes.map((change) =>
              h("li", { class: "pm-focus-item" }, `${change.kind} · ${change.path}`)
            )
      ),
      h("div", { class: "pm-actions pm-actions-end" }, [
        h(
          "button",
          {
            type: "button",
            class: "pm-button pm-button-ghost",
            disabled: state.isBusy.value,
            onClick: () => {
              void state.restoreSelectedVersion();
            }
          },
          state.isBusy.value ? "Restoring..." : "Restore Selected"
        )
      ])
    ])
  ]);
}

function versionMetrics(state: VersionsState): ProjectManagerMetric[] {
  const changedFiles = state.diff.value === null ? "No diff loaded" : `${String(state.diff.value.changedFiles)} files`;
  return [
    {
      label: "Snapshots",
      value: String(state.versions.value.length)
    },
    {
      label: "Selected",
      value: state.selectedVersionId.value || "None"
    },
    {
      label: "Current diff",
      value: changedFiles
    }
  ];
}

function renderVersionsView(projectSlug: string, state: VersionsState): VNode {
  return h("div", { class: "pm-view", "data-view": "versions" }, [
    renderPageHeader(
      projectSlug,
      "versions",
      "Project Versions",
      "Diff review and restore stay on their own route, while snapshot creation stays behind an explicit toggle."
    ),
    h("section", { class: "pm-card pm-stack" }, [
      renderMetricGrid(versionMetrics(state)),
      renderSectionHeader(
        "Snapshots",
        "Review diffs first, then open the composer when you need a new checkpoint.",
        h(
          "button",
          {
            type: "button",
            class: "pm-button pm-button-ghost",
            onClick: () => {
              state.composeOpen.value = !state.composeOpen.value;
            }
          },
          state.composeOpen.value ? "Hide Composer" : "New Snapshot"
        )
      ),
      renderVersionsComposer(state),
      state.error.value ? renderStatusMessage(state.error.value, "error") : null,
      renderVersionsBody(state)
    ])
  ]);
}

export const ProjectVersionsView = defineComponent({
  name: "ProjectVersionsView",
  setup() {
    const route = useRoute();
    const context = useProjectContextStore();
    const projectSlug = computed(() => String(route.params.slug ?? ""));
    const adminToken = computed(() => context.adminToken.trim());
    const state = createVersionsState(projectSlug, adminToken);

    onMounted(() => {
      void state.loadVersions(projectSlug.value);
    });
    watch(projectSlug, (slug) => {
      void state.loadVersions(slug);
    });

    return () => renderVersionsView(projectSlug.value, state);
  }
});
