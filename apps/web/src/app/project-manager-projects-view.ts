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
          h("h1", { class: "pm-title" }, "Route-based control plane"),
          h(
            "p",
            { class: "pm-copy" },
            "The Vue shell now routes projects into focused pages, so the control plane no longer depends on one overloaded screen."
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
          renderInfoCard("Current rollout", [
            renderFocusList([
              "Vue owns shell routing and primary layout",
              "workspace, versions, and AI keep dedicated routes",
              "strict lint, typecheck, unit, and smoke tests stay in the root gate",
              "legacy string-rendered shell can now be retired route by route"
            ])
          ])
        ])
      ]);
  }
});
