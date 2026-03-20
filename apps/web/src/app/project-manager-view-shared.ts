import { h, type VNode } from "vue";
import { RouterLink } from "vue-router";
import { createProjectRouteTabs } from "./project-route-tabs.ts";

export interface ProjectManagerMetric {
  label: string;
  value: string;
}

export function renderPageHeader(
  projectSlug: string,
  currentView: string,
  title: string,
  description: string
): VNode {
  const tabs = createProjectRouteTabs(projectSlug);

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
          h("span", projectSlug || "repository")
        ]),
        h("h1", { class: "pm-page-title" }, title),
        h("p", { class: "pm-copy" }, description)
      ]),
      h("span", { class: "pm-badge pm-badge-accent" }, currentView)
    ]),
    h(
      "nav",
      { class: "pm-tab-row", "aria-label": "Project sections" },
      tabs.map((tab) =>
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

export function renderMetricGrid(metrics: ProjectManagerMetric[]): VNode {
  return h(
    "div",
    { class: "pm-stat-row" },
    metrics.map((metric) =>
      h("div", { class: "pm-stat-card" }, [h("strong", metric.value), h("small", metric.label)])
    )
  );
}

export function renderStatusMessage(message: string, tone: "error" | "neutral" = "neutral"): VNode {
  return h("p", { class: ["pm-copy", tone === "error" ? "pm-error" : "pm-muted-block"] }, message);
}

export function renderWriteAccessFields(
  adminToken: string,
  onInput: (value: string) => void,
  purpose: string
): VNode {
  return h("div", { class: "pm-stack" }, [
    h("div", { class: "pm-page-copy" }, [
      renderSectionTitle("Write access"),
      h("p", { class: "pm-copy" }, purpose)
    ]),
    h("label", { class: "pm-field" }, [
      h("span", "Admin token"),
      h("input", {
        class: "pm-input",
        value: adminToken,
        placeholder: "Paste bearer token for write operations",
        onInput: (event: Event) => {
          onInput((event.target as HTMLInputElement).value.trim());
        }
      })
    ])
  ]);
}

export function renderWriteAccessCard(
  adminToken: string,
  onInput: (value: string) => void,
  purpose: string
): VNode {
  return h("section", { class: "pm-card pm-stack" }, [renderWriteAccessFields(adminToken, onInput, purpose)]);
}
