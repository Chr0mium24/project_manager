import { computed, defineComponent, h, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { GatewayProjectApiClient, type ManagedProjectRecord } from "../gateway-api.ts";
import { useProjectContextStore } from "./project-context-store.ts";
import { renderInfoCard, renderMetricGrid, renderStatusMessage } from "./project-manager-view-shared.ts";

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

function renderProjectRow(project: ReturnType<typeof useProjectContextStore>["projects"][number], detail: ManagedProjectRecord | null) {
  const runtimeHref = project.runtime === "static" ? `/p/${project.slug}` : `/app/${project.slug}`;

  return h("li", { class: "pm-project-row" }, [
    h("div", { class: "pm-project-main" }, [
      h("div", { class: "pm-project-title-row" }, [
        h("h2", { class: "pm-project-title" }, detail?.name ?? project.slug),
        h("span", { class: "pm-badge" }, project.runtime),
        h("span", { class: "pm-badge" }, detail?.framework ?? "loading")
      ]),
      h("p", { class: "pm-copy" }, detail?.description ?? "Loading repository description..."),
      h("div", { class: "pm-project-meta" }, [
        h("span", `slug: ${project.slug}`),
        h("span", `route: ${project.route}`),
        h("span", `entry: ${project.entry}`)
      ])
    ]),
    h("div", { class: "pm-project-actions" }, [
      h(
        RouterLink,
        {
          to: `/projects/${project.slug}`,
          class: "pm-project-link pm-project-link-primary"
        },
        () => "Open repository"
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
        h("section", { class: "pm-card pm-stack" }, [
          h("div", { class: "pm-page-copy" }, [
            h("p", { class: "pm-kicker" }, "Repositories"),
            h("h1", { class: "pm-title" }, "Managed projects"),
            h(
              "p",
              { class: "pm-copy" },
              "This is the repository index. Pick a project, then move into overview, workspace, versions, or AI from its own page."
            )
          ]),
          renderMetricGrid([
            {
              label: "Repositories",
              value: String(projects.value.length)
            },
            {
              label: "Static apps",
              value: String(projects.value.filter((project) => project.runtime === "static").length)
            },
            {
              label: "Dynamic apps",
              value: String(projects.value.filter((project) => project.runtime === "dynamic").length)
            }
          ])
        ]),
        renderInfoCard(
          "Repository list",
          projects.value.length === 0
            ? [
                context.projectsLoading
                  ? renderStatusMessage("Loading repositories...")
                  : renderStatusMessage(context.projectsError ?? "No repositories available yet.")
              ]
            : [
                h(
                  "ul",
                  { class: "pm-project-list", "aria-label": "Managed repositories" },
                  projects.value.map((project) => renderProjectRow(project, projectDetails.value[project.slug] ?? null))
                )
              ]
        )
      ]);
  }
});
