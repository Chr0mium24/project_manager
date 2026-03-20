import { computed, defineComponent, h, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { GatewayProjectApiClient, type ManagedProjectRecord } from "../gateway-api.ts";
import { useProjectContextStore } from "./project-context-store.ts";
import {
  renderInfoCard,
  renderStatusMessage
} from "./project-manager-view-shared.ts";

const client = new GatewayProjectApiClient();

async function readProjectDetails(slugs: string[]): Promise<Record<string, ManagedProjectRecord>> {
  const details = await Promise.all(
    slugs.map(async (slug) => {
      try {
        return await client.readProject(slug);
      } catch {
        return null;
      }
    })
  );

  return details
    .filter((detail): detail is ManagedProjectRecord => detail !== null)
    .reduce<Record<string, ManagedProjectRecord>>((allDetails, detail) => {
      allDetails[detail.slug] = detail;
      return allDetails;
    }, {});
}

function renderProjectCard(project: ReturnType<typeof useProjectContextStore>["projects"][number], detail: ManagedProjectRecord | null) {
  const runtimeHref = project.runtime === "static" ? `/p/${project.slug}` : `/app/${project.slug}`;

  return h("article", { class: "pm-project-card" }, [
    h("p", { class: "pm-kicker" }, `${project.runtime} project`),
    h("h2", { class: "pm-page-title" }, detail?.name ?? project.slug),
    h("p", { class: "pm-copy" }, detail?.description ?? "Loading project description..."),
    h("div", { class: "pm-project-meta" }, [
      h("span", project.slug),
      h("span", project.route),
      h("span", project.entry)
    ]),
    h("div", { class: "pm-project-actions" }, [
      h(
        RouterLink,
        {
          to: `/projects/${project.slug}`,
          class: "pm-project-link"
        },
        () => "Open manager"
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

export const ProjectsIndexView = defineComponent({
  name: "ProjectsIndexView",
  setup() {
    const context = useProjectContextStore();
    const projects = computed(() => context.projects);
    const projectDetails = ref<Record<string, ManagedProjectRecord>>({});

    async function loadProjectDetails() {
      projectDetails.value = await readProjectDetails(context.projects.map((project) => project.slug));
    }

    onMounted(() => {
      void (async () => {
        if (context.projects.length === 0 && !context.projectsLoading) {
          await context.loadProjects();
        }
        await loadProjectDetails();
      })();
    });
    watch(projects, () => {
      void loadProjectDetails();
    });

    return () =>
      h("div", { class: "pm-view", "data-view": "projects-index" }, [
        h("section", { class: "pm-card pm-hero" }, [
          h("p", { class: "pm-kicker" }, "Project index"),
          h("h1", { class: "pm-title" }, "Choose a project"),
          h(
            "p",
            { class: "pm-copy" },
            "Start here, choose a project, then move into the route that owns the workflow you need."
          )
        ]),
        renderInfoCard(
          "Projects",
          projects.value.length === 0
            ? [
                context.projectsLoading
                  ? renderStatusMessage("Loading managed projects...")
                  : renderStatusMessage(context.projectsError ?? "No projects available yet.")
              ]
            : [
                h(
                  "div",
                  { class: "pm-project-grid", "aria-label": "Managed projects" },
                  projects.value.map((project) => renderProjectCard(project, projectDetails.value[project.slug] ?? null))
                )
              ]
        )
      ]);
  }
});
