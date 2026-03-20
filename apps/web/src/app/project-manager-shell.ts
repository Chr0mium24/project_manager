import { computed, defineComponent, h, onMounted } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { useProjectContextStore } from "./project-context-store.ts";

export { PROJECT_MANAGER_SHELL_STYLES } from "./project-manager-shell-styles.ts";

function renderProjectLink(pathname: string, slug: string, runtime: string, routePath: string) {
  return h(
    RouterLink,
    {
      to: `/projects/${slug}`,
      class: ["pm-side-link", pathname.startsWith(`/projects/${slug}`) ? "is-active" : ""]
    },
    () =>
      h("span", { class: "pm-link-copy" }, [
        h("strong", slug),
        h("small", `${runtime} · ${routePath}`)
      ])
  );
}

export const ProjectManagerShell = defineComponent({
  name: "ProjectManagerShell",
  setup() {
    const route = useRoute();
    const context = useProjectContextStore();
    const projectSlug = computed(() => context.projectSlug);
    const selectedProject = computed(() => context.projects.find((project) => project.slug === projectSlug.value) ?? null);

    onMounted(() => {
      if (context.projects.length === 0 && !context.projectsLoading) {
        void context.loadProjects();
      }
    });

    return () =>
      h("div", { class: "pm-shell" }, [
        h("header", { class: "pm-topbar" }, [
          h("div", { class: "pm-topbar-inner" }, [
            h(
              RouterLink,
              {
                to: "/projects",
                class: "pm-brand"
              },
              () => "Project Manager"
            ),
            h(
              "span",
              { class: "pm-topbar-meta" },
              selectedProject.value === null ? "Repositories" : `${selectedProject.value.slug} repository`
            )
          ])
        ]),
        h("div", { class: "pm-layout" }, [
          h("aside", { class: "pm-sidebar" }, [
            h("section", { class: "pm-sidebar-section pm-stack" }, [
              h("p", { class: "pm-sidebar-title" }, "Repositories"),
              h("p", { class: "pm-sidebar-copy" }, "Use the repository list to move between managed projects."),
              h(
                RouterLink,
                {
                  to: "/projects",
                  class: ["pm-side-link", route.path === "/projects" ? "is-active" : ""]
                },
                () => "All projects"
              )
            ]),
            h("section", { class: "pm-sidebar-section pm-stack" }, [
              context.projectsLoading
                ? h("p", { class: "pm-copy" }, "Loading repositories...")
                : context.projectsError
                  ? h("p", { class: "pm-error" }, context.projectsError)
                  : h(
                      "nav",
                      { class: "pm-link-list", "aria-label": "Managed repositories" },
                      context.projects.map((project) =>
                        renderProjectLink(route.path, project.slug, project.runtime, project.route)
                      )
                    )
            ])
          ]),
          h("main", { class: "pm-main" }, [h(RouterView)])
        ])
      ]);
  }
});
