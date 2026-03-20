import { computed, defineComponent, h } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { createProjectRouteTabs } from "./project-route-tabs.ts";

function renderIntro(kicker: string, title: string, body: string) {
  return h("section", { class: "pm-card pm-hero", "data-kicker": kicker }, [
    h("p", { class: "pm-kicker" }, kicker),
    h("h1", { class: "pm-title" }, title),
    h("p", { class: "pm-copy" }, body)
  ]);
}

function renderFocusList(items: string[]) {
  return h(
    "ul",
    { class: "pm-focus-list" },
    items.map((item) => h("li", { class: "pm-focus-item" }, item))
  );
}

function createProjectView(viewKey: string, title: string, description: string, items: string[]) {
  return defineComponent({
    name: title.replaceAll(" ", ""),
    setup() {
      const route = useRoute();
      const projectSlug = computed(() => String(route.params.slug ?? ""));
      const tabs = computed(() => createProjectRouteTabs(projectSlug.value));
      return () =>
        h("div", { class: "pm-view", "data-view": viewKey }, [
          h("header", { class: "pm-page-head" }, [
            h("div", { class: "pm-page-copy" }, [
              h("p", { class: "pm-kicker" }, `${projectSlug.value || "project"} workflow`),
              h("h2", { class: "pm-page-title" }, title),
              h("p", { class: "pm-copy" }, description)
            ]),
            h(
              "nav",
              { class: "pm-tab-row", "aria-label": "Project sections" },
              tabs.value.map((tab) =>
                h(
                  RouterLink,
                  {
                    to: tab.href,
                    class: ["pm-tab-link", tab.key === viewKey ? "is-active" : ""]
                  },
                  () => tab.label
                )
              )
            )
          ]),
          h("section", { class: "pm-card" }, [
            h("h3", { class: "pm-section-title" }, "Current focus"),
            renderFocusList(items)
          ])
        ]);
    }
  });
}

export const ProjectsIndexView = defineComponent({
  name: "ProjectsIndexView",
  setup() {
    return () =>
      h("div", { class: "pm-view", "data-view": "projects-index" }, [
        renderIntro(
          "Project index",
          "Route-based control plane",
          "Projects, workspace editing, version review, and AI task operations are split into dedicated views so the frontend no longer depends on one oversized page."
        ),
        h("section", { class: "pm-grid" }, [
          h("article", { class: "pm-card" }, [
            h("h3", { class: "pm-section-title" }, "Primary routes"),
            renderFocusList([
              "/projects",
              "/projects/:slug",
              "/projects/:slug/workspace",
              "/projects/:slug/versions",
              "/projects/:slug/ai"
            ])
          ]),
          h("article", { class: "pm-card" }, [
            h("h3", { class: "pm-section-title" }, "Gate-first rollout"),
            renderFocusList([
              "eslint stays hard-fail",
              "strict typecheck runs in the root gate",
              "web unit tests run in the root gate",
              "route smoke tests run in the root gate"
            ])
          ])
        ])
      ]);
  }
});

export const ProjectOverviewView = createProjectView(
  "overview",
  "Project Overview",
  "Use this route for project identity, runtime metadata, and quick navigation into workspace, versions, and AI tasks.",
  ["project metadata", "runtime status", "entry and route summary"]
);

export const ProjectWorkspaceView = createProjectView(
  "workspace",
  "Project Workspace",
  "Keep file navigation and editing isolated here so the editor is not competing with task review or version comparison in the same viewport.",
  ["file tree", "focused editor", "save flow and file status"]
);

export const ProjectVersionsView = createProjectView(
  "versions",
  "Project Versions",
  "Snapshot review, diff inspection, and restore flow belong on a dedicated route with enough room for comparison.",
  ["snapshot list", "diff summary", "restore action"]
);

export const ProjectAiTasksView = createProjectView(
  "ai",
  "Project AI Tasks",
  "AI task creation, task review, and apply operations are grouped here without overlapping the workspace editor.",
  ["task creation", "task list", "summary and apply review"]
);
