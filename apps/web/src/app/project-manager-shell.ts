import { computed, defineComponent, h } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { useProjectContextStore } from "./project-context-store.ts";
import { createProjectRouteTabs } from "./project-route-tabs.ts";

function renderTopNav(routePath: string) {
  return h("div", { class: "pm-topbar" }, [
    h("div", { class: "pm-brand-block" }, [
      h("p", { class: "pm-kicker" }, "Frontend rebuild"),
      h("strong", { class: "pm-brand" }, "Project Manager")
    ]),
    h("code", { class: "pm-route-pill" }, routePath)
  ]);
}

export const PROJECT_MANAGER_SHELL_STYLES = `
:root { --pm-bg: #fafafa; --pm-panel: #ffffff; --pm-panel-soft: #f5f5f5; --pm-line: #e5e5e5; --pm-text: #171717; --pm-muted: #737373; --pm-accent: #14b8a6; --pm-accent-deep: #0f766e; --pm-shadow: 0 24px 80px rgba(23, 23, 23, 0.06); }
* { box-sizing: border-box; }
body { margin: 0; background: var(--pm-bg); color: var(--pm-text); font-family: "Manrope", "Avenir Next", "Segoe UI", sans-serif; }
.pm-shell { width: min(1240px, calc(100% - 32px)); margin: 24px auto 40px; display: grid; gap: 20px; }
.pm-topbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; border-bottom: 1px solid var(--pm-line); padding-bottom: 16px; }
.pm-brand-block { display: grid; gap: 4px; }
.pm-kicker { margin: 0; color: var(--pm-muted); font-size: 0.76rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; }
.pm-brand { font-size: 1.05rem; }
.pm-route-pill { border: 1px solid #ccfbf1; background: #f0fdfa; color: var(--pm-accent-deep); padding: 8px 10px; font-family: "JetBrains Mono", "SFMono-Regular", monospace; font-size: 0.8rem; }
.pm-layout { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 20px; }
.pm-sidebar, .pm-card { border: 1px solid var(--pm-line); background: var(--pm-panel); box-shadow: var(--pm-shadow); }
.pm-sidebar { padding: 18px; display: grid; gap: 12px; align-content: start; }
.pm-link-list { display: grid; gap: 10px; }
.pm-side-link, .pm-tab-link { border: 1px solid var(--pm-line); background: var(--pm-panel); color: var(--pm-text); text-decoration: none; padding: 12px 14px; font-weight: 700; transition: border-color 120ms ease, background 120ms ease; }
.pm-side-link:hover, .pm-tab-link:hover { border-color: #a3a3a3; background: var(--pm-panel-soft); }
.pm-side-link.is-active, .pm-tab-link.is-active { border-color: #99f6e4; background: #f0fdfa; color: var(--pm-accent-deep); box-shadow: inset 0 0 0 1px rgba(20, 184, 166, 0.18); }
.pm-main { display: grid; gap: 20px; }
.pm-view { display: grid; gap: 20px; }
.pm-hero, .pm-card { padding: 22px; }
.pm-title, .pm-page-title { margin: 0; line-height: 1; letter-spacing: -0.04em; }
.pm-title { font-size: clamp(2rem, 4vw, 3.6rem); }
.pm-page-title { font-size: clamp(1.6rem, 3vw, 2.4rem); }
.pm-copy { margin: 0; color: var(--pm-muted); line-height: 1.7; }
.pm-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.pm-section-title { margin: 0 0 14px; font-size: 0.84rem; color: var(--pm-muted); text-transform: uppercase; letter-spacing: 0.16em; }
.pm-focus-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
.pm-focus-item { border: 1px solid var(--pm-line); background: var(--pm-panel-soft); padding: 12px 14px; }
.pm-page-head { display: grid; gap: 16px; }
.pm-page-copy { display: grid; gap: 8px; }
.pm-tab-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
@media (max-width: 960px) { .pm-layout, .pm-grid, .pm-tab-row { grid-template-columns: 1fr; } .pm-shell { width: min(100% - 20px, 1240px); margin-top: 20px; } .pm-topbar { align-items: start; flex-direction: column; } }
`;

export const ProjectManagerShell = defineComponent({
  name: "ProjectManagerShell",
  setup() {
    const route = useRoute();
    const context = useProjectContextStore();
    const projectSlug = computed(() => context.projectSlug);
    const tabs = computed(() => (projectSlug.value ? createProjectRouteTabs(projectSlug.value) : []));
    return () =>
      h("div", { class: "pm-shell" }, [
        renderTopNav(route.path),
        h("div", { class: "pm-layout" }, [
          h("aside", { class: "pm-sidebar" }, [
            h("p", { class: "pm-kicker" }, "Routes"),
            h("nav", { class: "pm-link-list", "aria-label": "Primary routes" }, [
              h(
                RouterLink,
                {
                  to: "/projects",
                  class: ["pm-side-link", route.path === "/projects" ? "is-active" : ""]
                },
                () => "Projects"
              ),
              ...tabs.value.map((tab) =>
                h(
                  RouterLink,
                  {
                    to: tab.href,
                    class: ["pm-side-link", route.path === tab.href ? "is-active" : ""]
                  },
                  () => tab.label
                )
              )
            ])
          ]),
          h("main", { class: "pm-main" }, [h(RouterView)])
        ])
      ]);
  }
});
