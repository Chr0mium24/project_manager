import { h, type Ref, type VNode } from "vue";
import type { ProjectCreateInput } from "../gateway-api.ts";
import { renderStatusMessage } from "./project-manager-view-shared.ts";

export interface ProjectCreateModalProps {
  actionError: string | null;
  createBusy: boolean;
  createDialogRef: Ref<HTMLElement | null>;
  createForm: ProjectCreateInput;
  createModalOpen: boolean;
  createSlugInputRef: Ref<HTMLElement | null>;
  closeCreateModal(): void;
  onCreateProject(): void;
  setCreateField<K extends keyof ProjectCreateInput>(key: K, value: ProjectCreateInput[K]): void;
}

function renderTextField(
  label: string,
  fieldValue: string | undefined,
  onInput: (value: string) => void,
  options: {
    className?: string;
    inputRef?: Ref<HTMLElement | null>;
  } = {}
): VNode {
  const inputProps = options.inputRef === undefined ? {} : { ref: options.inputRef };
  return h("label", { class: options.className ?? "pm-field" }, [
    h("span", label),
    h("input", {
      ...inputProps,
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

function renderCreateModalIntro(): VNode {
  return h("div", { class: "pm-page-copy" }, [
    h("p", { class: "pm-kicker" }, "New repository"),
    h("h2", { id: "pm-create-project-title", class: "pm-page-title" }, "Create an AI-bootstrapped project"),
    h(
      "p",
      { id: "pm-create-project-description", class: "pm-copy" },
      "Define the published shell, then give AI the bootstrap prompt. The first task starts immediately after creation."
    )
  ]);
}

function renderCreateModalForm(props: ProjectCreateModalProps): VNode {
  return h("div", { class: "pm-form-grid" }, [
    renderTextField("Project slug", props.createForm.slug, (value) => {
      props.setCreateField("slug", value);
    }, { className: "pm-field", inputRef: props.createSlugInputRef }),
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
    }, { className: "pm-field pm-field-full" }),
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
  ]);
}

export function renderAdminCreateModal(props: ProjectCreateModalProps): VNode | null {
  if (!props.createModalOpen) {
    return null;
  }

  return h("div", {
    class: "pm-modal-backdrop",
    onClick: (event: Event) => {
      if (event.target === event.currentTarget) {
        props.closeCreateModal();
      }
    }
  }, [
    h("section", {
      ref: props.createDialogRef,
      class: "pm-access-modal pm-card",
      role: "dialog",
      tabindex: -1,
      "aria-describedby": "pm-create-project-description",
      "aria-labelledby": "pm-create-project-title",
      "aria-modal": "true"
    }, [
      renderCreateModalIntro(),
      props.actionError ? renderStatusMessage(props.actionError, "error") : null,
      renderCreateModalForm(props)
    ])
  ]);
}
