import { computed, defineComponent, h, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { GatewayProjectApiClient, type ManagedProjectRecord } from "../gateway-api.ts";
import { useProjectContextStore } from "./project-context-store.ts";
import { runtimeHrefForSlug } from "./project-runtime-link.ts";
import { renderPageHeader, renderStatusMessage } from "./project-manager-view-shared.ts";

const client = new GatewayProjectApiClient();

function renderOverviewMain(project: ManagedProjectRecord) {
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
      h("dd", project.entry),
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
        )
  ]);
}

export const ProjectOverviewView = defineComponent({
  name: "ProjectOverviewView",
  setup() {
    const route = useRoute();
    const context = useProjectContextStore();
    const projectSlug = computed(() => String(route.params.slug ?? ""));
    const publicHref = computed(() => runtimeHrefForSlug(context.projects, projectSlug.value));
    const project = ref<ManagedProjectRecord | null>(null);
    const isLoading = ref(false);
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
          : renderOverviewMain(project.value)
      ]);
  }
});
