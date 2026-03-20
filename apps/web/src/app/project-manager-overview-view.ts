import { computed, defineComponent, h, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { useRoute } from "vue-router";
import { GatewayProjectApiClient, type ManagedProjectRecord } from "../gateway-api.ts";
import { renderPageHeader, renderSectionTitle, renderStatusMessage } from "./project-manager-view-shared.ts";

const client = new GatewayProjectApiClient();

function renderIdentityCard(project: ManagedProjectRecord) {
  const runtimeHref = project.runtime === "static" ? `/p/${project.slug}` : `/app/${project.slug}`;

  return h("section", { class: "pm-card pm-stack" }, [
    renderSectionTitle("Project identity"),
    h("h3", { class: "pm-page-title" }, project.name),
    h("p", { class: "pm-copy" }, project.description),
    h("div", { class: "pm-stat-row" }, [
      h("div", { class: "pm-stat-card" }, [h("strong", project.runtime), h("small", "Runtime")]),
      h("div", { class: "pm-stat-card" }, [h("strong", project.route), h("small", "Public route")]),
      h("div", { class: "pm-stat-card" }, [h("strong", project.entry), h("small", "Entry file")])
    ]),
    h("div", { class: "pm-project-actions" }, [
      h(
        RouterLink,
        {
          to: `/projects/${project.slug}/workspace`,
          class: "pm-project-link"
        },
        () => "Open workspace"
      ),
      h(
        "a",
        {
          href: runtimeHref,
          class: "pm-project-link"
        },
        "Open page"
      )
    ])
  ]);
}

export const ProjectOverviewView = defineComponent({
  name: "ProjectOverviewView",
  setup() {
    const route = useRoute();
    const projectSlug = computed(() => String(route.params.slug ?? ""));
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
        renderPageHeader(
          projectSlug.value,
          "overview",
          "Project Overview",
          "Use this route to understand the project and decide which workflow route you need next."
        ),
        project.value === null
          ? h("section", { class: "pm-card" }, [
              isLoading.value
                ? renderStatusMessage("Loading project summary...")
                : renderStatusMessage(error.value ?? "No project selected.", error.value ? "error" : "neutral")
            ])
          : h("div", { class: "pm-view" }, [renderIdentityCard(project.value)])
      ]);
  }
});
