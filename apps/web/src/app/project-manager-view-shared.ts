import { h, type VNode } from "vue";
import { RouterLink } from "vue-router";
import { createProjectRouteTabs } from "./project-route-tabs.ts";

interface PageHeaderOptions {
  projectSlug: string;
  currentView: string;
  title: string;
  description: string;
  action?: VNode | null;
}

export function renderPageHeader(options: PageHeaderOptions): VNode {
  const tabs = createProjectRouteTabs(options.projectSlug);

  return h("header", { class: "pm-page-head pm-card pm-page-header-card" }, [
    h("div", { class: "pm-page-head-top" }, [
      h("div", { class: "pm-page-copy" }, [
        h("div", { class: "pm-page-breadcrumb" }, [
          h(
            RouterLink,
            {
              to: "/projects",
              class: "pm-breadcrumb-link"
            },
            () => "Projects"
          ),
          h("span", "/"),
          h("span", options.projectSlug || "repository")
        ]),
        h("h1", { class: "pm-page-title" }, options.title),
        h("p", { class: "pm-copy" }, options.description)
      ]),
      h("div", { class: "pm-page-head-actions" }, [
        options.action ?? null,
        h("span", { class: "pm-badge pm-badge-accent" }, options.currentView)
      ])
    ]),
    h(
      "nav",
      { class: "pm-tab-row", "aria-label": "Project sections" },
      tabs.map((tab) =>
        h(
          RouterLink,
          {
            to: tab.href,
            class: ["pm-tab-link", tab.key === options.currentView ? "is-active" : ""]
          },
          () => tab.label
        )
      )
    )
  ]);
}

export function renderSectionTitle(title: string): VNode {
  return h("h2", { class: "pm-section-title" }, title);
}

export function renderSectionHeader(title: string, description: string, action?: VNode | null): VNode {
  return h("div", { class: "pm-card-head" }, [
    h("div", { class: "pm-page-copy" }, [
      renderSectionTitle(title),
      h("p", { class: "pm-copy" }, description)
    ]),
    action ?? null
  ]);
}

export function renderFocusList(items: string[]): VNode {
  return h(
    "ul",
    { class: "pm-focus-list" },
    items.map((item) => h("li", { class: "pm-focus-item" }, item))
  );
}

export function renderInfoCard(title: string, children: VNode[]): VNode {
  return h("section", { class: "pm-card pm-stack" }, [renderSectionTitle(title), ...children]);
}

export function renderStatusMessage(message: string, tone: "error" | "neutral" = "neutral"): VNode {
  return h("p", { class: ["pm-copy", tone === "error" ? "pm-error" : "pm-muted-block"] }, message);
}
