import { computed, defineComponent, h, onMounted } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { useProjectContextStore } from "./project-context-store.ts";

function renderTopNav(projectSlug: string) {
  return h("div", { class: "pm-topbar" }, [
    h("div", { class: "pm-topbar-copy" }, [
      h("div", { class: "pm-brand-block" }, [
        h("p", { class: "pm-kicker" }, "Frontend rebuild"),
        h("strong", { class: "pm-brand" }, "Project Manager")
      ]),
      h(
        "p",
        { class: "pm-copy" },
        projectSlug
          ? "Project routes now own the control plane, so each workflow can stay focused."
          : "Select a managed project and move through its dedicated routes."
      )
    ]),
    projectSlug
      ? h("span", { class: "pm-context-pill" }, projectSlug)
      : h(
          RouterLink,
          {
            to: "/projects",
            class: "pm-topbar-link"
          },
          () => "Browse projects"
        )
  ]);
}

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

export const PROJECT_MANAGER_SHELL_STYLES = `
:root { --pm-bg: #fafaf8; --pm-panel: #ffffff; --pm-panel-soft: #f5f4ef; --pm-line: #e7e5df; --pm-text: #171717; --pm-muted: #737373; --pm-accent: #0f766e; --pm-accent-soft: #ecfdf5; --pm-shadow: 0 24px 80px rgba(23, 23, 23, 0.06); }
* { box-sizing: border-box; }
body { margin: 0; background: linear-gradient(180deg, #f8f7f2 0%, #fafaf8 22%, #f5f5f4 100%); color: var(--pm-text); font-family: "Manrope", "Avenir Next", "Segoe UI", sans-serif; }
.pm-shell { width: min(1180px, calc(100% - 28px)); margin: 20px auto 40px; display: grid; gap: 18px; }
.pm-topbar, .pm-sidebar, .pm-card { border: 1px solid var(--pm-line); background: var(--pm-panel); box-shadow: var(--pm-shadow); }
.pm-topbar { display: flex; justify-content: space-between; gap: 18px; align-items: end; padding: 18px 20px; }
.pm-topbar-copy { display: grid; gap: 8px; }
.pm-brand-block, .pm-link-copy, .pm-page-copy, .pm-main, .pm-view, .pm-stack, .pm-sidebar-section, .pm-link-list { display: grid; gap: 8px; }
.pm-kicker { margin: 0; color: var(--pm-muted); font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; }
.pm-brand { font-size: 1.05rem; }
.pm-context-pill, .pm-topbar-link, .pm-badge { border: 1px solid #c7f9f1; background: var(--pm-accent-soft); color: var(--pm-accent); padding: 8px 12px; font-size: 0.8rem; font-weight: 800; text-decoration: none; text-transform: uppercase; letter-spacing: 0.12em; }
.pm-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 18px; }
.pm-sidebar { padding: 18px; display: grid; gap: 16px; align-content: start; }
.pm-side-link, .pm-tab-link, .pm-button, .pm-list-button, .pm-tree-button { border: 1px solid var(--pm-line); background: var(--pm-panel); color: var(--pm-text); text-decoration: none; padding: 12px 14px; font-weight: 700; transition: border-color 120ms ease, background 120ms ease; }
.pm-side-link:hover, .pm-tab-link:hover, .pm-list-button:hover, .pm-tree-button:hover { border-color: #bdb8aa; background: var(--pm-panel-soft); }
.pm-side-link.is-active, .pm-tab-link.is-active, .pm-list-button.is-active, .pm-tree-button.is-active { border-color: #99f6e4; background: #f0fdfa; color: var(--pm-accent); box-shadow: inset 0 0 0 1px rgba(15, 118, 110, 0.14); }
.pm-card { padding: 20px; }
.pm-page-header-card { gap: 16px; }
.pm-hero { padding: 24px; }
.pm-title, .pm-page-title { margin: 0; line-height: 1; letter-spacing: -0.04em; }
.pm-title { font-size: clamp(2rem, 4vw, 3.4rem); }
.pm-page-title { font-size: clamp(1.4rem, 3vw, 2.2rem); }
.pm-copy { margin: 0; color: var(--pm-muted); line-height: 1.7; }
.pm-inline-note { margin: 0; color: var(--pm-muted); font-size: 0.84rem; line-height: 1.6; }
.pm-error { color: #9a2c1f; }
.pm-muted-block { min-height: 24px; }
.pm-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.pm-quick-grid, .pm-stat-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.pm-quick-link, .pm-stat-card { border: 1px solid var(--pm-line); background: var(--pm-panel-soft); padding: 14px; display: grid; gap: 6px; color: inherit; text-decoration: none; }
.pm-quick-link strong, .pm-stat-card strong { font-size: 0.98rem; }
.pm-quick-link small, .pm-stat-card small, .pm-link-copy small, .pm-list-button small, .pm-tree-button small { color: var(--pm-muted); font-size: 0.78rem; letter-spacing: 0.04em; }
.pm-section-title { margin: 0; font-size: 0.8rem; color: var(--pm-muted); text-transform: uppercase; letter-spacing: 0.16em; }
.pm-focus-list, .pm-list, .pm-tree-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.pm-focus-item { border: 1px solid var(--pm-line); background: var(--pm-panel-soft); padding: 12px 14px; }
.pm-page-head { display: grid; gap: 14px; }
.pm-badge-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.pm-tab-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.pm-card-head, .pm-actions { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.pm-actions-end { justify-content: flex-end; }
.pm-subcard { padding: 16px; box-shadow: none; background: var(--pm-panel-soft); }
.pm-meta-list { margin: 0; display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 8px 14px; }
.pm-meta-list dt { color: var(--pm-muted); font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; }
.pm-meta-list dd { margin: 0; font-weight: 600; }
.pm-field, .pm-field-full { display: grid; gap: 6px; }
.pm-field span, .pm-field-full span { color: var(--pm-muted); font-size: 0.76rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; }
.pm-input, .pm-textarea { width: 100%; border: 1px solid #d4d4d4; background: var(--pm-panel); color: var(--pm-text); padding: 12px 14px; font: inherit; }
.pm-textarea { min-height: 180px; resize: vertical; }
.pm-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.pm-field-full { grid-column: 1 / -1; }
.pm-button { cursor: pointer; background: var(--pm-text); color: #ffffff; }
.pm-button:disabled { cursor: not-allowed; opacity: 0.55; }
.pm-button-ghost { background: transparent; color: var(--pm-text); }
.pm-list-button, .pm-tree-button { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 12px; text-align: left; cursor: pointer; }
.pm-tree-dir { color: var(--pm-muted); font-size: 0.76rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; padding: 4px 0; }
.pm-workspace-card, .pm-editor-shell, .pm-version-grid { display: grid; gap: 16px; }
.pm-workspace-grid, .pm-version-grid { grid-template-columns: minmax(220px, 280px) minmax(0, 1fr); }
.pm-workspace-grid.is-focused { grid-template-columns: minmax(0, 1fr); }
.pm-editor-stack { display: grid; gap: 12px; }
.pm-editor { min-height: 420px; font-family: "JetBrains Mono", "SFMono-Regular", monospace; font-size: 0.85rem; line-height: 1.6; }
.pm-details { border-top: 1px solid var(--pm-line); padding-top: 14px; }
.pm-details summary { cursor: pointer; list-style: none; font-weight: 700; }
.pm-details summary::-webkit-details-marker { display: none; }
.pm-details-body { display: grid; gap: 12px; padding-top: 12px; }
@media (max-width: 960px) { .pm-layout, .pm-grid, .pm-tab-row, .pm-quick-grid, .pm-stat-row { grid-template-columns: 1fr; } .pm-shell { width: min(100% - 18px, 1180px); margin-top: 16px; } .pm-topbar, .pm-card-head, .pm-actions { align-items: start; flex-direction: column; } }
@media (max-width: 960px) { .pm-form-grid, .pm-workspace-grid, .pm-version-grid { grid-template-columns: 1fr; } }
`;

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
        renderTopNav(projectSlug.value),
        h("div", { class: "pm-layout" }, [
          h("aside", { class: "pm-sidebar" }, [
            h("section", { class: "pm-sidebar-section" }, [
              h("p", { class: "pm-kicker" }, "Navigation"),
              h("nav", { class: "pm-link-list", "aria-label": "Primary routes" }, [
                h(
                  RouterLink,
                  {
                    to: "/projects",
                    class: ["pm-side-link", route.path === "/projects" ? "is-active" : ""]
                  },
                  () => "All Projects"
                )
              ])
            ]),
            selectedProject.value === null
              ? null
              : h("section", { class: "pm-sidebar-section" }, [
                  h("p", { class: "pm-kicker" }, "Current project"),
                  renderProjectLink(
                    route.path,
                    selectedProject.value.slug,
                    selectedProject.value.runtime,
                    selectedProject.value.route
                  ),
                  h("p", { class: "pm-inline-note" }, "Open overview, workspace, versions, or AI from the page header.")
                ]),
            h("section", { class: "pm-sidebar-section" }, [
              h("p", { class: "pm-kicker" }, "Managed projects"),
              context.projectsLoading
                ? h("p", { class: "pm-copy" }, "Loading projects...")
                : context.projectsError
                  ? h("p", { class: "pm-error" }, context.projectsError)
                  : h(
                      "nav",
                      { class: "pm-link-list", "aria-label": "Managed projects" },
                      context.projects.map((project) =>
                        renderProjectLink(route.path, project.slug, project.runtime, project.route)
                      )
                    )
            ]),
            h("details", { class: "pm-details" }, [
              h("summary", "Write access"),
              h("div", { class: "pm-details-body" }, [
                h("p", { class: "pm-inline-note" }, "Only needed for file saves, snapshots, restore, and AI apply."),
                h("label", { class: "pm-field" }, [
                  h("span", "Admin Token"),
                  h("input", {
                    class: "pm-input",
                    value: context.adminToken,
                    placeholder: "Paste bearer token for writes",
                    onInput: (event: Event) => {
                      context.setAdminToken((event.target as HTMLInputElement).value.trim());
                    }
                  })
                ])
              ])
            ])
          ]),
          h("main", { class: "pm-main" }, [h(RouterView)])
        ])
      ]);
  }
});
