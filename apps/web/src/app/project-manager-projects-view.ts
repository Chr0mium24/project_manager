import { computed, defineComponent, h, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { useProjectContextStore } from "./project-context-store.ts";
import {
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
                ),
                h(
                  "p",
                  { class: "pm-inline-note" },
                  "Open overview first if you need context. Jump directly to workspace, versions, or AI only when the task is already clear."
                )
              ]
        )
      ]);
  }
});
