import { h, type VNode } from "vue";
import { renderStatusMessage, renderWriteAccessFields } from "./project-manager-view-shared.ts";

export interface ProjectAiWriteActionsProps {
  adminToken: string;
  composeOpen: boolean;
  taskSlug: string;
  prompt: string;
  isBusy: boolean;
  canApplySelectedTask: boolean;
  setAdminToken(value: string): void;
  setTaskSlug(value: string): void;
  setPrompt(value: string): void;
  toggleComposer(): void;
  createTask(): void;
  applySelectedTask(): void;
}

function renderAiComposer(props: ProjectAiWriteActionsProps): VNode | null {
  if (!props.composeOpen) {
    return null;
  }

  return h("div", { class: "pm-form-grid" }, [
    h("label", { class: "pm-field" }, [
      h("span", "Task slug"),
      h("input", {
        class: "pm-input",
        value: props.taskSlug,
        placeholder: "fix-copy or add-nav",
        onInput: (event: Event) => {
          props.setTaskSlug((event.target as HTMLInputElement).value);
        }
      })
    ]),
    h("label", { class: "pm-field pm-field-full" }, [
      h("span", "Prompt"),
      h("textarea", {
        class: "pm-textarea",
        value: props.prompt,
        placeholder: "Describe the change you want the AI task to perform",
        onInput: (event: Event) => {
          props.setPrompt((event.target as HTMLTextAreaElement).value);
        }
      })
    ]),
    h("div", { class: "pm-actions pm-actions-end pm-field-full" }, [
      h(
        "button",
        {
          type: "button",
          class: "pm-button",
          disabled: props.isBusy,
          onClick: () => {
            props.createTask();
          }
        },
        props.isBusy ? "Running..." : "Create task"
      )
    ])
  ]);
}

export function renderAiWriteActions(props: ProjectAiWriteActionsProps): VNode {
  return h("section", { class: "pm-card pm-stack" }, [
    h("div", { class: "pm-card-head" }, [
      h("div", { class: "pm-page-copy" }, [
        h("h2", { class: "pm-section-title" }, "Task actions"),
        h(
          "p",
          { class: "pm-copy" },
          "Create a new AI task or apply the selected completed task. Review stays in the main panel above."
        )
      ]),
      h(
        "button",
        {
          type: "button",
          class: "pm-button pm-button-ghost",
          onClick: () => {
            props.toggleComposer();
          }
        },
        props.composeOpen ? "Hide task form" : "New task"
      )
    ]),
    renderWriteAccessFields(
      props.adminToken,
      (value) => {
        props.setAdminToken(value);
      },
      "Required only for AI task creation and apply on this page."
    ),
    renderAiComposer(props),
    !props.canApplySelectedTask
      ? renderStatusMessage("Select a completed task in the queue before applying it.")
      : h("div", { class: "pm-actions pm-actions-end" }, [
          h(
            "button",
            {
              type: "button",
              class: "pm-button pm-button-ghost",
              disabled: props.isBusy,
              onClick: () => {
                props.applySelectedTask();
              }
            },
            props.isBusy ? "Applying..." : "Apply selected"
          )
        ])
  ]);
}
