import { computed, defineComponent, h, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { GatewayProjectApiClient, type ManagedProjectRecord } from "../gateway-api.ts";
import { renderPageHeader, renderStatusMessage } from "./project-manager-view-shared.ts";

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
      copy: "Edit files and save changes."
    },
    {
      path: "versions",
      title: "Versions",
      copy: "Review snapshots and restore."
    },
    {
      path: "ai",
      title: "AI Tasks",
      copy: "Queue prompts, review output, and apply."
    }
  ];

  return h(
    "div",
    { class: "pm-quick-grid" },
    links.map((link) =>
      h(
        RouterLink,
        {
          to: `/projects/${projectSlug}/${link.path}`,
          class: "pm-quick-link"
        },
        () => [h("strong", link.title), h("small", link.copy)]
      )
    )
  );
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
          "Keep this route for project identity and quick hand-offs into workspace, versions, and AI."
        ),
        project.value === null
          ? h("section", { class: "pm-card" }, [
              isLoading.value
                ? renderStatusMessage("Loading project summary...")
                : renderStatusMessage(error.value ?? "No project selected.", error.value ? "error" : "neutral")
            ])
          : h("section", { class: "pm-card pm-stack" }, [
              h("div", { class: "pm-page-copy" }, [
                h("h3", { class: "pm-section-title" }, "Summary"),
                h("p", { class: "pm-copy" }, project.value.description)
              ]),
              h("div", { class: "pm-stat-row" }, [
                h("div", { class: "pm-stat-card" }, [h("strong", project.value.runtime), h("small", "Runtime")]),
                h("div", { class: "pm-stat-card" }, [h("strong", project.value.route), h("small", "Route")]),
                h("div", { class: "pm-stat-card" }, [
                  h("strong", project.value.latestVersion),
                  h("small", "Latest version")
                ])
              ]),
              renderMetaList(project.value),
              h("div", { class: "pm-page-copy" }, [
                h("h3", { class: "pm-section-title" }, "Next step"),
                renderRouteLinks(projectSlug.value)
              ])
            ])
      ]);
  }
});
