import { computed, defineComponent, h, onMounted, ref, watch, type VNode } from "vue";
import { RouterLink } from "vue-router";
import { GatewayProjectApiClient, type ManagedProjectRecord } from "../gateway-api.ts";
import { useProjectContextStore } from "./project-context-store.ts";
import { runtimeHrefForProject } from "./project-runtime-link.ts";
import { renderInfoCard, renderStatusMessage } from "./project-manager-view-shared.ts";

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

function matchesProject(
  project: ReturnType<typeof useProjectContextStore>["projects"][number],
  detail: ManagedProjectRecord | null,
  searchQuery: string
): boolean {
  if (searchQuery.length === 0) {
    return true;
  }

  const searchTarget = [
    project.slug,
    detail?.name ?? "",
    detail?.description ?? "",
    project.route
  ].join(" ").toLowerCase();

  return searchTarget.includes(searchQuery);
}

function renderPublicProjectCard(project: ReturnType<typeof useProjectContextStore>["projects"][number], detail: ManagedProjectRecord | null) {
  return h(
    "a",
    {
      href: runtimeHrefForProject(project),
      class: "pm-directory-card"
    },
    [
      h("div", { class: "pm-project-title-row" }, [
        h("h2", { class: "pm-project-title" }, detail?.name ?? project.slug),
        h("span", { class: "pm-badge" }, project.runtime)
      ]),
      h("p", { class: "pm-copy" }, detail?.description ?? "Loading project description..."),
      h("div", { class: "pm-project-meta" }, [h("span", project.route)])
    ]
  );
}

function renderAdminProjectRow(project: ReturnType<typeof useProjectContextStore>["projects"][number], detail: ManagedProjectRecord | null) {
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
          href: runtimeHrefForProject(project),
          class: "pm-project-link"
        },
        "Open page"
      )
    ])
  ]);
}

interface ProjectsIndexRenderState {
  adminMode: boolean;
  projectsLoading: boolean;
  projectsError: string | null;
  filteredProjects: ReturnType<typeof useProjectContextStore>["projects"];
  projectDetails: Record<string, ManagedProjectRecord>;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

function renderProjectsIndexView(state: ProjectsIndexRenderState): VNode {
  return h("div", { class: "pm-view", "data-view": "projects-index" }, [
    state.adminMode
      ? h("section", { class: "pm-card pm-stack" }, [
          h("div", { class: "pm-page-copy" }, [
            h("p", { class: "pm-kicker" }, "Admin"),
            h("h1", { class: "pm-title" }, "Repository management"),
            h(
              "p",
              { class: "pm-copy" },
              "Admin mode is active. Pick a repository to open overview, workspace, versions, or AI tasks."
            )
          ])
        ])
      : h("section", { class: "pm-card pm-stack" }, [
          h("div", { class: "pm-page-copy" }, [
            h("p", { class: "pm-kicker" }, "Projects"),
            h("h1", { class: "pm-title" }, "Project directory"),
            h(
              "p",
              { class: "pm-copy" },
              "Browse published projects. Search by name or description, then jump straight into the selected project."
            )
          ]),
          h("label", { class: "pm-field" }, [
            h("span", "Search projects"),
            h("input", {
              class: "pm-input pm-directory-search",
              value: state.searchQuery,
              placeholder: "Search project name or description",
              onInput: (event: Event) => {
                state.setSearchQuery((event.target as HTMLInputElement).value);
              }
            })
          ])
        ]),
    renderInfoCard(
      state.adminMode ? "Repositories" : "All projects",
      state.filteredProjects.length === 0
        ? [
            state.projectsLoading
              ? renderStatusMessage("Loading projects...")
              : renderStatusMessage(
                  state.projectsError ?? (state.searchQuery ? "No projects match the current search." : "No projects available yet.")
                )
          ]
        : state.adminMode
          ? [
              h(
                "ul",
                { class: "pm-project-list", "aria-label": "Managed repositories" },
                state.filteredProjects.map((project) =>
                  renderAdminProjectRow(project, state.projectDetails[project.slug] ?? null)
                )
              )
            ]
          : [
              h(
                "div",
                { class: "pm-directory-grid", "aria-label": "Public projects" },
                state.filteredProjects.map((project) =>
                  renderPublicProjectCard(project, state.projectDetails[project.slug] ?? null)
                )
              )
            ]
    )
  ]);
}

export const ProjectsIndexView = defineComponent({
  name: "ProjectsIndexView",
  setup() {
    const context = useProjectContextStore();
    const projects = computed(() => context.projects);
    const adminMode = computed(() => context.adminToken.trim().length > 0);
    const projectDetails = ref<Record<string, ManagedProjectRecord>>({});
    const searchQuery = ref("");

    const filteredProjects = computed(() => {
      const normalizedQuery = searchQuery.value.trim().toLowerCase();
      return projects.value.filter((project) =>
        matchesProject(project, projectDetails.value[project.slug] ?? null, normalizedQuery)
      );
    });

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
      renderProjectsIndexView({
        adminMode: adminMode.value,
        projectsLoading: context.projectsLoading,
        projectsError: context.projectsError,
        filteredProjects: filteredProjects.value,
        projectDetails: projectDetails.value,
        searchQuery: searchQuery.value,
        setSearchQuery: (value) => {
          searchQuery.value = value;
        }
      });
  }
});
