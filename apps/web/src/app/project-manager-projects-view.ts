import { computed, defineComponent, h, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { useProjectContextStore } from "./project-context-store.ts";
import {
  renderFocusList,
  renderInfoCard,
  renderStatusMessage
} from "./project-manager-view-shared.ts";

export const ProjectsIndexView = defineComponent({
  name: "ProjectsIndexView",
  setup() {
    const context = useProjectContextStore();
    const projects = computed(() => context.projects);

    onMounted(() => {
      if (context.projects.length === 0 && !context.projectsLoading) {
        void context.loadProjects();
      }
    });

    return () =>
      h("div", { class: "pm-view", "data-view": "projects-index" }, [
        h("section", { class: "pm-card pm-hero" }, [
          h("p", { class: "pm-kicker" }, "Project index"),
          h("h1", { class: "pm-title" }, "Choose a project"),
          h(
            "p",
            { class: "pm-copy" },
            "The shell only selects context. Once you enter a project, each route owns one workflow: overview, workspace, versions, or AI."
          )
        ]),
        h("section", { class: "pm-grid" }, [
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
                    "nav",
                    { class: "pm-link-list", "aria-label": "Managed projects" },
                    projects.value.map((project) =>
                      h(
                        RouterLink,
                        {
                          to: `/projects/${project.slug}`,
                          class: "pm-side-link"
                        },
                        () =>
                          h("span", { class: "pm-link-copy" }, [
                            h("strong", project.slug),
                            h("small", `${project.runtime} · ${project.route}`)
                          ])
                      )
                    )
                  )
                ]
          ),
          renderInfoCard("Route responsibilities", [
            renderFocusList([
              "overview identifies the project and hands off into workflows",
              "workspace owns file browsing, editing, and saving",
              "versions owns snapshot review and restore",
              "AI owns task queue, task detail, and apply"
            ])
          ])
        ])
      ]);
  }
});
