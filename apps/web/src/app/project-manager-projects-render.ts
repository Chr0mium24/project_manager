import { h, type Ref, type VNode } from "vue";
import { RouterLink } from "vue-router";
import type { AiTaskRecord } from "../ai-task-api.ts";
import type { ManagedProjectRecord, ProjectCreateInput, ProjectListEntry } from "../gateway-api.ts";
import {
  renderAdminCreateModal,
  type ProjectCreateModalProps
} from "./project-manager-project-create-modal.ts";
import { runtimeHrefForProject } from "./project-runtime-link.ts";
import { renderInfoCard, renderStatusMessage } from "./project-manager-view-shared.ts";

function renderProjectFacts(
  items: Array<{
    label: string;
    value: string | VNode;
  }>
): VNode {
  return h(
    "dl",
    { class: "pm-project-facts" },
    items.flatMap((item) => [
      h("div", [
        h("dt", item.label),
        h("dd", [item.value])
      ])
    ])
  );
}

function renderPublicProjectCard(project: ProjectListEntry, detail: ManagedProjectRecord | null): VNode {
  return h("a", { href: runtimeHrefForProject(project), class: "pm-directory-card" }, [
    h("div", { class: "pm-project-summary" }, [
      h("div", { class: "pm-project-title-row" }, [
        h("h2", { class: "pm-project-title" }, detail?.name ?? project.name),
        h("span", { class: "pm-badge" }, project.runtime),
        detail?.framework ? h("span", { class: "pm-badge" }, detail.framework) : null
      ]),
      h("p", { class: "pm-copy" }, detail?.description ?? "Loading project description..."),
      renderProjectFacts([
        {
          label: "Route",
          value: project.route
        },
        {
          label: "Entry",
          value: project.entry
        },
        {
          label: "Updated",
          value: project.updatedAt
        },
        {
          label: "Visibility",
          value: project.visibility
        }
      ])
    ]),
    h("div", { class: "pm-project-card-footer" }, [
      h("span", { class: "pm-selection-note" }, "Published route"),
      h("span", { class: "pm-project-card-link" }, "Open project")
    ])
  ]);
}

function renderAdminProjectRow(project: ProjectListEntry, detail: ManagedProjectRecord | null): VNode {
  const projectName = detail?.name ?? project.name;
  return h("li", { class: "pm-project-row" }, [
    h("div", { class: "pm-project-main" }, [
      h("div", { class: "pm-project-title-row" }, [
        h(
          RouterLink,
          {
            to: `/projects/${project.slug}`,
            class: "pm-project-title-link"
          },
          () => projectName
        ),
        h("span", { class: "pm-badge" }, project.runtime),
        h("span", { class: "pm-badge" }, detail?.framework ?? "Metadata loading")
      ]),
      h("p", { class: "pm-copy" }, detail?.description ?? "Loading repository description..."),
      renderProjectFacts([
        {
          label: "Slug",
          value: project.slug
        },
        {
          label: "Route",
          value: project.route
        },
        {
          label: "Entry",
          value: h(
            RouterLink,
            {
              to: {
                path: `/projects/${project.slug}/workspace`,
                query: { path: project.entry }
              },
              class: "pm-project-meta-link"
            },
            () => project.entry
          )
        },
        {
          label: "Updated",
          value: project.updatedAt
        }
      ])
    ])
  ]);
}

function renderAdminTaskRow(task: AiTaskRecord): VNode {
  return h("li", { class: "pm-project-row" }, [
    h("div", { class: "pm-project-main" }, [
      h("div", { class: "pm-project-title-row" }, [
        h("h2", { class: "pm-project-title" }, `${task.projectSlug}/${task.taskSlug}`),
        h("span", { class: "pm-badge" }, task.status),
        h("span", { class: "pm-badge" }, task.sandboxMode)
      ]),
      h("p", { class: "pm-copy" }, task.prompt),
      h("div", { class: "pm-project-meta" }, [
        h("span", `Created ${task.createdAt}`),
        task.parentTaskId === null ? null : h("span", `Parent ${task.parentTaskId}`)
      ])
    ]),
    h("div", { class: "pm-project-actions" }, [
      h(
        RouterLink,
        {
          to: `/projects/${task.projectSlug}/ai?taskId=${encodeURIComponent(task.taskId)}&compose=follow-up`,
          class: "pm-project-link pm-project-link-primary"
        },
        () => "Continue session"
      ),
      h(
        RouterLink,
        {
          to: `/projects/${task.projectSlug}/ai?taskId=${encodeURIComponent(task.taskId)}`,
          class: "pm-project-link"
        },
        () => "Review task"
      )
    ])
  ]);
}

export interface ProjectsIndexRenderProps {
  actionError: string | null;
  adminMode: boolean;
  createBusy: boolean;
  createDialogRef: Ref<HTMLElement | null>;
  createForm: ProjectCreateInput;
  createModalOpen: boolean;
  createSlugInputRef: Ref<HTMLElement | null>;
  filteredProjects: ProjectListEntry[];
  projectDetails: Record<string, ManagedProjectRecord>;
  projectsError: string | null;
  projectsLoading: boolean;
  runningTasks: AiTaskRecord[];
  searchQuery: string;
  taskError: string | null;
  tasksLoading: boolean;
  closeCreateModal(): void;
  onCreateProject(): void;
  openCreateModal(): void;
  setCreateField<K extends keyof ProjectCreateInput>(key: K, value: ProjectCreateInput[K]): void;
  setSearchQuery(value: string): void;
}

function renderAdminCreatePanel(props: ProjectsIndexRenderProps): VNode {
  return h("section", { class: "pm-card pm-stack" }, [
    h("div", { class: "pm-card-head" }, [
      h("div", { class: "pm-page-copy" }, [
        h("p", { class: "pm-kicker" }, "Admin"),
        h("h1", { class: "pm-title" }, "Repository management"),
        h("p", { class: "pm-copy" }, "Inspect active AI work, open repositories, or start a new project with a first AI bootstrap task.")
      ]),
      h("button", {
        type: "button",
        class: "pm-button",
        onClick: () => {
          props.openCreateModal();
        }
      }, "New repository")
    ])
  ]);
}

function renderPublicIntro(props: ProjectsIndexRenderProps): VNode {
  return h("section", { class: "pm-card pm-stack" }, [
    h("div", { class: "pm-page-copy" }, [
      h("p", { class: "pm-kicker" }, "Projects"),
      h("h1", { class: "pm-title" }, "Project directory"),
      h("p", { class: "pm-copy" }, "Browse published projects. Search by name or description, then jump straight into the route you need.")
    ]),
    h("label", { class: "pm-field" }, [
      h("span", "Search projects"),
      h("input", {
        class: "pm-input pm-directory-search",
        value: props.searchQuery,
        placeholder: "Search project name or description",
        onInput: (event: Event) => {
          props.setSearchQuery((event.target as HTMLInputElement).value);
        }
      })
    ])
  ]);
}

function renderActiveTaskPanel(props: ProjectsIndexRenderProps): VNode | null {
  if (!props.adminMode) {
    return null;
  }
  return renderInfoCard(
    "Active AI tasks",
    props.runningTasks.length === 0
      ? [renderStatusMessage(props.tasksLoading ? "Loading tasks..." : (props.taskError ?? "No queued or running AI tasks right now."))]
      : [h("ul", { class: "pm-project-list", "aria-label": "Running ai tasks" }, props.runningTasks.map(renderAdminTaskRow))]
  );
}

function renderProjectCollection(props: ProjectsIndexRenderProps): VNode {
  const emptyMessage = props.projectsError ?? (props.searchQuery ? "No projects match the current search." : "No projects available yet.");
  const children = props.filteredProjects.length === 0
    ? [props.projectsLoading ? renderStatusMessage("Loading projects...") : renderStatusMessage(emptyMessage)]
    : props.adminMode
      ? [
          h(
            "ul",
            { class: "pm-project-list", "aria-label": "Managed repositories" },
            props.filteredProjects.map((project) =>
              renderAdminProjectRow(project, props.projectDetails[project.slug] ?? null)
            )
          )
        ]
      : [
          h(
            "div",
            { class: "pm-directory-grid", "aria-label": "Public projects" },
            props.filteredProjects.map((project) => renderPublicProjectCard(project, props.projectDetails[project.slug] ?? null))
          )
        ];
  return renderInfoCard(props.adminMode ? "Repositories" : "All projects", children);
}

export function renderProjectsIndexView(props: ProjectsIndexRenderProps): VNode {
  const createModalProps: ProjectCreateModalProps = {
    actionError: props.actionError,
    createBusy: props.createBusy,
    createDialogRef: props.createDialogRef,
    createForm: props.createForm,
    createModalOpen: props.createModalOpen,
    createSlugInputRef: props.createSlugInputRef,
    closeCreateModal: props.closeCreateModal,
    onCreateProject: props.onCreateProject,
    setCreateField: props.setCreateField
  };

  return h("div", { class: "pm-view", "data-view": "projects-index" }, [
    h("div", {
      class: "pm-view-stack",
      inert: props.createModalOpen ? "" : undefined,
      "aria-hidden": props.createModalOpen ? "true" : undefined
    }, [
      props.adminMode ? renderAdminCreatePanel(props) : renderPublicIntro(props),
      renderActiveTaskPanel(props),
      renderProjectCollection(props)
    ]),
    renderAdminCreateModal(createModalProps)
  ]);
}
