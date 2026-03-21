import { computed, defineComponent, h, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { GatewayProjectApiClient, type ManagedProjectRecord } from "../gateway-api.ts";
import { useProjectContextStore } from "./project-context-store.ts";
import { runtimeHrefForSlug } from "./project-runtime-link.ts";
import { renderPageHeader, renderStatusMessage } from "./project-manager-view-shared.ts";

const client = new GatewayProjectApiClient();

function renderOverviewMain(
  project: ManagedProjectRecord,
  adminMode: boolean,
  isDeleting: boolean,
  onDelete: () => void
) {
  return h("section", { class: "pm-card pm-stack" }, [
    h("div", { class: "pm-page-copy" }, [
      h("p", { class: "pm-kicker" }, "Repository"),
      h("h2", { class: "pm-page-title" }, project.name),
      h("p", { class: "pm-copy" }, project.description)
    ]),
    h("dl", { class: "pm-meta-list" }, [
      h("dt", "Owner"),
      h("dd", project.owner),
      h("dt", "Framework"),
      h("dd", project.framework),
      h("dt", "Language"),
      h("dd", project.mainLanguage),
      h("dt", "Entry"),
      h("dd", [
        h(
          RouterLink,
          {
            to: {
              path: `/projects/${project.slug}/workspace`,
              query: { path: project.entry }
            },
            class: "pm-entry-link"
          },
          () => `${project.entry} ->`
        )
      ]),
      h("dt", "Route"),
      h("dd", project.route),
      h("dt", "Latest version"),
      h("dd", project.latestVersion),
      h("dt", "Updated"),
      h("dd", project.updatedAt)
    ]),
    project.tags.length === 0
      ? null
      : h(
          "div",
          { class: "pm-badge-row" },
          project.tags.map((tag) => h("span", { class: "pm-badge" }, tag))
        ),
    !adminMode
      ? null
      : h("div", { class: "pm-actions pm-actions-end" }, [
          h("button", {
            type: "button",
            class: "pm-button pm-button-ghost pm-button-danger",
            disabled: isDeleting,
            onClick: () => {
              onDelete();
            }
          }, isDeleting ? "Deleting..." : "Delete repository")
        ])
  ]);
}

export const ProjectOverviewView = defineComponent({
  name: "ProjectOverviewView",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const context = useProjectContextStore();
    const projectSlug = computed(() => String(route.params.slug ?? ""));
    const publicHref = computed(() => runtimeHrefForSlug(context.projects, projectSlug.value));
    const adminMode = computed(() => context.adminToken.trim().length > 0);
    const project = ref<ManagedProjectRecord | null>(null);
    const isLoading = ref(false);
    const isDeleting = ref(false);
    const error = ref<string | null>(null);

    async function loadProject(slug: string) {
      if (!slug) {
        project.value = null;
        return;
      }

      isLoading.value = true;
      error.value = null;
      try {
        project.value = await client.readProject(slug);
      } catch (loadError) {
        error.value = loadError instanceof Error ? loadError.message : "unknown project error";
      } finally {
        isLoading.value = false;
      }
    }

    onMounted(() => {
      void loadProject(projectSlug.value);
    });

    watch(projectSlug, (slug) => {
      void loadProject(slug);
    });

    async function deleteProject() {
      if (project.value === null || !adminMode.value) {
        return;
      }
      if (typeof window !== "undefined" && !window.confirm(`Delete project ${project.value.slug}?`)) {
        return;
      }

      isDeleting.value = true;
      error.value = null;
      try {
        await client.deleteProject(project.value.slug, context.adminToken.trim());
        await context.loadProjects();
        await router.push("/projects");
      } catch (deleteError) {
        error.value = deleteError instanceof Error ? deleteError.message : "Unable to delete project.";
      } finally {
        isDeleting.value = false;
      }
    }

    return () =>
      h("div", { class: "pm-view", "data-view": "overview" }, [
        renderPageHeader({
          projectSlug: projectSlug.value,
          currentView: "overview",
          title: "Repository overview",
          description: "Start from repository identity and public route status, then move into the workflow tab you need.",
          action: publicHref.value
            ? h(
                "a",
                {
                  href: publicHref.value,
                  class: "pm-project-link"
                },
                "Open page"
              )
            : null
        }),
        project.value === null
          ? h("section", { class: "pm-card" }, [
              isLoading.value
                ? renderStatusMessage("Loading repository overview...")
                : renderStatusMessage(error.value ?? "No project selected.", error.value ? "error" : "neutral")
            ])
          : renderOverviewMain(project.value, adminMode.value, isDeleting.value, () => {
              void deleteProject();
            })
      ]);
  }
});
