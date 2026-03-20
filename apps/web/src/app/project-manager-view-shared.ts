import { h, type VNode } from "vue";
import { RouterLink } from "vue-router";
import { createProjectRouteTabs } from "./project-route-tabs.ts";

export function renderPageHeader(
  projectSlug: string,
  currentView: string,
  title: string,
  description: string
): VNode {
  return h("header", { class: "pm-page-head pm-card pm-page-header-card" }, [
    h("div", { class: "pm-page-copy" }, [
      h("div", { class: "pm-badge-row" }, [
        h("span", { class: "pm-badge" }, projectSlug || "project"),
        h("p", { class: "pm-kicker" }, `${currentView} route`)
      ]),
      h("h2", { class: "pm-page-title" }, title),
      h("p", { class: "pm-copy" }, description)
    ]),
    h(
      "nav",
      { class: "pm-tab-row", "aria-label": "Project sections" },
      createProjectRouteTabs(projectSlug).map((tab) =>
        h(
          RouterLink,
          {
            to: tab.href,
            class: ["pm-tab-link", tab.key === currentView ? "is-active" : ""]
          },
          () => tab.label
        )
      )
    )
  ]);
}

export function renderSectionTitle(title: string): VNode {
  return h("h3", { class: "pm-section-title" }, title);
}

export function renderFocusList(items: string[]): VNode {
  return h(
    "ul",
    { class: "pm-focus-list" },
    items.map((item) => h("li", { class: "pm-focus-item" }, item))
  );
}

export function renderInfoCard(title: string, children: VNode[]): VNode {
  return h("section", { class: "pm-card" }, [renderSectionTitle(title), ...children]);
}

export function renderStatusMessage(message: string, tone: "error" | "neutral" = "neutral"): VNode {
  return h("p", { class: ["pm-copy", tone === "error" ? "pm-error" : "pm-muted-block"] }, message);
}
