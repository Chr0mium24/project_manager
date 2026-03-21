import { h, type VNode } from "vue";
import { RouterLink } from "vue-router";
import type { AiTaskRecord } from "../ai-task-api.ts";
import type { ManagedProjectRecord, ProjectCreateInput, ProjectListEntry } from "../gateway-api.ts";
import { runtimeHrefForProject } from "./project-runtime-link.ts";
import { renderInfoCard, renderStatusMessage } from "./project-manager-view-shared.ts";

function renderPublicProjectCard(project: ProjectListEntry, detail: ManagedProjectRecord | null) {
  return h("a", { href: runtimeHrefForProject(project), class: "pm-directory-card" }, [
    h("div", { class: "pm-project-title-row" }, [
      h("h2", { class: "pm-project-title" }, detail?.name ?? project.slug),
      h("span", { class: "pm-badge" }, project.runtime)
    ]),
    h("p", { class: "pm-copy" }, detail?.description ?? "Loading project description..."),
    h("div", { class: "pm-project-meta" }, [h("span", project.route)])
  ]);
}

function renderAdminProjectRow(
  project: ProjectListEntry,
  detail: ManagedProjectRecord | null
) {
  const projectName = detail?.name ?? project.slug;
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
        h("span", { class: "pm-badge" }, detail?.framework ?? "loading")
      ]),
      h("p", { class: "pm-copy" }, detail?.description ?? "Loading repository description..."),
      h("div", { class: "pm-project-meta" }, [
        h("span", `slug: ${project.slug}`),
        h("span", `route: ${project.route}`),
        h(
          RouterLink,
          {
            to: {
              path: `/projects/${project.slug}/workspace`,
              query: { path: project.entry }
            },
            class: "pm-entry-link"
          },
          () => `entry: ${project.entry} ->`
        )
      ])
    ]),
    h("a", { href: runtimeHrefForProject(project), class: "pm-project-open-page" }, "open page ->")
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
        h("span", `created: ${task.createdAt}`),
        task.parentTaskId === null ? null : h("span", `parent: ${task.parentTaskId}`)
      ])
    ]),
    h("div", { class: "pm-project-actions" }, [
      h(
        RouterLink,
        {
          to: `/projects/${task.projectSlug}/ai?taskId=${encodeURIComponent(task.taskId)}&compose=follow-up`,
          class: "pm-project-link pm-project-link-primary"
        },
        () => "Open chat"
      ),
      h(
        RouterLink,
        {
          to: `/projects/${task.projectSlug}/ai?taskId=${encodeURIComponent(task.taskId)}`,
          class: "pm-project-link"
        },
        () => "Inspect task"
      )
    ])
  ]);
}

export interface ProjectsIndexRenderProps {
  actionError: string | null;
  adminMode: boolean;
  createBusy: boolean;
  createForm: ProjectCreateInput;
  createModalOpen: boolean;
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

function renderTextField(
  label: string,
  fieldValue: string | undefined,
  onInput: (value: string) => void,
  className = "pm-field"
): VNode {
  return h("label", { class: className }, [
    h("span", label),
    h("input", {
      class: "pm-input",
      value: fieldValue,
      onInput: (event: Event) => {
        onInput((event.target as HTMLInputElement).value);
      }
    })
  ]);
}

function renderSelectField<T extends string>(
  label: string,
  fieldValue: T | undefined,
  options: T[],
  onChange: (value: T) => void
): VNode {
  return h("label", { class: "pm-field" }, [
    h("span", label),
    h("select", {
      class: "pm-input",
      value: fieldValue,
      onChange: (event: Event) => {
        onChange((event.target as HTMLSelectElement).value as T);
      }
    }, options.map((option) => h("option", { value: option }, option)))
  ]);
}

function renderAdminCreateModal(props: ProjectsIndexRenderProps): VNode | null {
  if (!props.createModalOpen) {
    return null;
  }

  return h("div", { class: "pm-modal-backdrop" }, [
    h("section", { class: "pm-access-modal pm-card", role: "dialog", "aria-modal": "true" }, [
      h("div", { class: "pm-page-copy" }, [
        h("p", { class: "pm-kicker" }, "New repository"),
        h("h2", { class: "pm-page-title" }, "AI create project"),
        h("p", { class: "pm-copy" }, "Define the project shell and the bootstrap prompt. The AI task will start right after creation.")
      ]),
      props.actionError ? renderStatusMessage(props.actionError, "error") : null,
      h("div", { class: "pm-form-grid" }, [
        renderTextField("Project slug", props.createForm.slug, (value) => {
          props.setCreateField("slug", value);
        }),
        renderTextField("Project name", props.createForm.name, (value) => {
          props.setCreateField("name", value);
        }),
        renderSelectField("Runtime", props.createForm.runtime, ["static", "dynamic"], (value) => {
          props.setCreateField("runtime", value);
        }),
        renderSelectField("Visibility", props.createForm.visibility, ["public", "private"], (value) => {
          props.setCreateField("visibility", value);
        }),
        renderTextField("Description", props.createForm.description, (value) => {
          props.setCreateField("description", value);
        }, "pm-field pm-field-full"),
        h("label", { class: "pm-field pm-field-full" }, [
          h("span", "AI bootstrap prompt"),
          h("textarea", {
            class: "pm-textarea",
            value: props.createForm.aiPrompt,
            placeholder: "Describe the project you want AI to create.",
            onInput: (event: Event) => {
              props.setCreateField("aiPrompt", (event.target as HTMLTextAreaElement).value);
            }
          })
        ]),
        renderTextField("AI task slug", props.createForm.aiTaskSlug, (value) => {
          props.setCreateField("aiTaskSlug", value);
        }),
        renderSelectField("Sandbox", props.createForm.sandboxMode, ["workspace-write", "danger-full-access"], (value) => {
          props.setCreateField("sandboxMode", value);
        }),
        h("div", { class: "pm-actions pm-actions-end pm-field-full" }, [
          h("button", {
            type: "button",
            class: "pm-button pm-button-ghost",
            onClick: () => {
              props.closeCreateModal();
            }
          }, "Cancel"),
          h("button", {
            type: "button",
            class: "pm-button",
            disabled: props.createBusy,
            onClick: () => {
              props.onCreateProject();
            }
          }, props.createBusy ? "Creating..." : "Create project")
        ])
      ])
    ])
  ]);
}

function renderAdminCreatePanel(props: ProjectsIndexRenderProps): VNode {
  return h("section", { class: "pm-card pm-stack" }, [
    h("div", { class: "pm-card-head" }, [
      h("div", { class: "pm-page-copy" }, [
        h("p", { class: "pm-kicker" }, "Admin"),
        h("h1", { class: "pm-title" }, "Repository management"),
        h("p", { class: "pm-copy" }, "Inspect active AI work, open repositories, or start a new AI-created project.")
      ]),
      h("button", {
        type: "button",
        class: "pm-button",
        onClick: () => {
          props.openCreateModal();
        }
      }, "New repository")
    ]),
    renderAdminCreateModal(props)
  ]);
}

function renderPublicIntro(props: ProjectsIndexRenderProps): VNode {
  return h("section", { class: "pm-card pm-stack" }, [
    h("div", { class: "pm-page-copy" }, [
      h("p", { class: "pm-kicker" }, "Projects"),
      h("h1", { class: "pm-title" }, "Project directory"),
      h("p", { class: "pm-copy" }, "Browse published projects. Search by name or description, then jump straight into the selected project.")
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
  return h("div", { class: "pm-view", "data-view": "projects-index" }, [
    props.adminMode ? renderAdminCreatePanel(props) : renderPublicIntro(props),
    renderActiveTaskPanel(props),
    renderProjectCollection(props)
  ]);
}
