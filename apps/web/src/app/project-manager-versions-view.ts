import { computed, defineComponent, h, onMounted, ref, watch, type ComputedRef, type Ref, type VNode } from "vue";
import { useRoute } from "vue-router";
import { GatewayProjectApiClient, type ProjectVersionDiff, type ProjectVersionRecord } from "../gateway-api.ts";
import { describeProtectedActionError } from "./project-manager-admin-access.ts";
import { useProjectContextStore } from "./project-context-store.ts";
import { runtimeHrefForSlug } from "./project-runtime-link.ts";
import { renderVersionDetail } from "./project-manager-versions-detail.ts";
import { renderVersionsWriteActions } from "./project-manager-versions-write-actions.ts";
import { renderPageHeader, renderSectionHeader, renderStatusMessage } from "./project-manager-view-shared.ts";

const client = new GatewayProjectApiClient();

interface VersionsState {
  versions: Ref<ProjectVersionRecord[]>;
  selectedVersionId: Ref<string>;
  diff: Ref<ProjectVersionDiff | null>;
  restoreConfirmed: Ref<boolean>;
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
  restoreConfirmed: Ref<boolean>;
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
    context.restoreConfirmed.value = false;
    context.diff.value = null;
    context.error.value = null;
    try {
      context.diff.value = await client.readVersionDiff(context.projectSlug.value, versionId);
    } catch (loadError) {
      context.error.value = describeProtectedActionError(loadError, "Unable to load the project version diff.");
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
    context.restoreConfirmed.value = false;
    context.diff.value = null;
    try {
      context.versions.value = await client.listVersions(slug);
      context.composeOpen.value = context.versions.value.length === 0;
      const latestVersion = context.versions.value[0]?.versionId ?? "";
      if (latestVersion) {
        await selectVersion(latestVersion);
      }
    } catch (loadError) {
      context.error.value = describeProtectedActionError(loadError, "Unable to load project snapshots.");
    } finally {
      context.isLoading.value = false;
    }
  }

  return { loadVersions, selectVersion };
}

function createVersionMutations(context: VersionMutationContext) {
  async function createVersion() {
    if (!context.projectSlug.value) {
      return;
    }
    if (context.adminToken.value.length === 0) {
      context.error.value = "Admin access is required for snapshots. Open Admin access from the header.";
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
      context.error.value = describeProtectedActionError(createError, "Unable to create the snapshot.");
    } finally {
      context.isBusy.value = false;
    }
  }

  async function restoreSelectedVersion() {
    if (!context.projectSlug.value || !context.selectedVersionId.value) {
      return;
    }
    if (context.adminToken.value.length === 0) {
      context.error.value = "Admin access is required for restore. Open Admin access from the header.";
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
      context.error.value = describeProtectedActionError(restoreError, "Unable to restore the selected snapshot.");
    } finally {
      context.isBusy.value = false;
    }
  }

  return { createVersion, restoreSelectedVersion };
}

function createVersionsState(projectSlug: ComputedRef<string>, adminToken: ComputedRef<string>): VersionsState {
  const versions = ref<ProjectVersionRecord[]>([]);
  const selectedVersionId = ref("");
  const diff = ref<ProjectVersionDiff | null>(null);
  const restoreConfirmed = ref(false);
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
    restoreConfirmed,
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
    restoreConfirmed,
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

function renderVersionsBody(state: VersionsState): VNode {
  if (state.isLoading.value) {
    return renderStatusMessage("Loading snapshots...");
  }

  return h("div", { class: "pm-version-grid" }, [
    renderVersionsList(state),
    renderVersionDetail({
      diff: state.diff.value,
      selectedVersionId: state.selectedVersionId.value,
      versions: state.versions.value
    })
  ]);
}

function renderVersionsView(projectSlug: string, state: VersionsState, publicHref: string | null): VNode {
  return h("div", { class: "pm-view", "data-view": "versions" }, [
    renderPageHeader({
      projectSlug,
      currentView: "versions",
      title: "Repository history",
      description: "Review snapshots here before restoring repository state.",
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
      renderSectionHeader(
        "Snapshot history",
        "Select a snapshot from the left column to inspect its current file-level diff."
      ),
      state.error.value ? renderStatusMessage(state.error.value, "error") : null,
      renderVersionsBody(state)
    ]),
    renderVersionsWriteActions({
      selectedVersionId: state.selectedVersionId.value,
      composeOpen: state.composeOpen.value,
      restoreConfirmed: state.restoreConfirmed.value,
      message: state.message.value,
      isBusy: state.isBusy.value,
      setMessage: (value) => {
        state.message.value = value;
      },
      setRestoreConfirmed: (value) => {
        state.restoreConfirmed.value = value;
      },
      toggleComposer: () => {
        state.composeOpen.value = !state.composeOpen.value;
      },
      createVersion: () => {
        void state.createVersion();
      },
      restoreSelectedVersion: () => {
        void state.restoreSelectedVersion();
      }
    })
  ]);
}

export const ProjectVersionsView = defineComponent({
  name: "ProjectVersionsView",
  setup() {
    const route = useRoute();
    const context = useProjectContextStore();
    const projectSlug = computed(() => String(route.params.slug ?? ""));
    const adminToken = computed(() => context.adminToken.trim());
    const publicHref = computed(() => runtimeHrefForSlug(context.projects, projectSlug.value));
    const state = createVersionsState(projectSlug, adminToken);

    onMounted(() => {
      void state.loadVersions(projectSlug.value);
    });
    watch(projectSlug, (slug) => {
      void state.loadVersions(slug);
    });

    return () => renderVersionsView(projectSlug.value, state, publicHref.value);
  }
});
