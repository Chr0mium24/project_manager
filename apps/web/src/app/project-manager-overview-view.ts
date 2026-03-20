import { computed, defineComponent, h, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { GatewayProjectApiClient, type ManagedProjectRecord } from "../gateway-api.ts";
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

function renderOverviewActions(project: ManagedProjectRecord) {
  const runtimeHref = project.runtime === "static" ? `/p/${project.slug}` : `/app/${project.slug}`;

  return h("section", { class: "pm-card pm-stack" }, [
    h("div", { class: "pm-page-copy" }, [
      h("h2", { class: "pm-section-title" }, "Next"),
      h("p", { class: "pm-copy" }, "Use the repository tabs for work. Use the public page link to inspect the running project.")
    ]),
    h("div", { class: "pm-project-actions" }, [
      h(
        RouterLink,
        {
          to: `/projects/${project.slug}/workspace`,
          class: "pm-project-link pm-project-link-primary"
        },
        () => "Open workspace"
      ),
      h(
        RouterLink,
        {
          to: `/projects/${project.slug}/versions`,
          class: "pm-project-link"
        },
        () => "Open versions"
      ),
      h(
        RouterLink,
        {
          to: `/projects/${project.slug}/ai`,
          class: "pm-project-link"
        },
        () => "Open AI tasks"
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
          "Repository overview",
          "Start from repository identity and public route status, then move into the workflow tab you need."
        ),
        project.value === null
          ? h("section", { class: "pm-card" }, [
              isLoading.value
                ? renderStatusMessage("Loading repository overview...")
                : renderStatusMessage(error.value ?? "No project selected.", error.value ? "error" : "neutral")
            ])
          : h("div", { class: "pm-column-grid" }, [renderOverviewMain(project.value), renderOverviewActions(project.value)])
      ]);
  }
});
