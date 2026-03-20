import { computed, defineComponent, h, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { GatewayProjectApiClient, type ManagedProjectRecord } from "../gateway-api.ts";
import { renderPageHeader, renderSectionTitle, renderStatusMessage } from "./project-manager-view-shared.ts";

const client = new GatewayProjectApiClient();

function renderMetaList(project: ManagedProjectRecord) {
  const items = [
    ["Runtime", project.runtime],
    ["Route", project.route],
    ["Entry", project.entry],
    ["Framework", project.framework],
    ["Language", project.mainLanguage],
    ["Owner", project.owner]
  ];

  return h(
    "dl",
    { class: "pm-meta-list" },
    items.flatMap(([label, value]) => [h("dt", label), h("dd", value)])
  );
}

function renderRouteLinks(projectSlug: string) {
  const links = [
    {
      path: "workspace",
      title: "Workspace",
      copy: "Open this route when you need to edit source files and save them back."
    },
    {
      path: "versions",
      title: "Versions",
      copy: "Open this route when you need to checkpoint, compare, or restore history."
    },
    {
      path: "ai",
      title: "AI Tasks",
      copy: "Open this route when you need to enqueue prompts, inspect output, or apply changes."
    }
  ];

  return h(
    "div",
    { class: "pm-flow-grid" },
    links.map((link) =>
      h(
        RouterLink,
        {
          to: `/projects/${projectSlug}/${link.path}`,
          class: "pm-flow-card"
        },
        () => [h("strong", link.title), h("p", { class: "pm-copy" }, link.copy)]
      )
    )
  );
}

function renderIdentityCard(project: ManagedProjectRecord) {
  return h("section", { class: "pm-card pm-stack" }, [
    renderSectionTitle("Project identity"),
    h("h3", { class: "pm-page-title" }, project.name),
    h("p", { class: "pm-copy" }, project.description),
    h("div", { class: "pm-stat-row" }, [
      h("div", { class: "pm-stat-card" }, [h("strong", project.runtime), h("small", "Runtime")]),
      h("div", { class: "pm-stat-card" }, [h("strong", project.route), h("small", "Public route")]),
      h("div", { class: "pm-stat-card" }, [h("strong", project.entry), h("small", "Entry file")])
    ])
  ]);
}

function renderFactsCard(project: ManagedProjectRecord) {
  return h("section", { class: "pm-card pm-stack" }, [
    renderSectionTitle("Project facts"),
    renderMetaList(project)
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
          : h("div", { class: "pm-view" }, [
              renderIdentityCard(project.value),
              h("section", { class: "pm-card pm-stack" }, [
                renderSectionTitle("Choose a workflow"),
                h(
                  "p",
                  { class: "pm-copy" },
                  "Overview does not edit files, checkpoint history, or run AI. It only hands you into the route that owns that job."
                ),
                renderRouteLinks(projectSlug.value)
              ]),
              renderFactsCard(project.value)
            ])
      ]);
  }
});
