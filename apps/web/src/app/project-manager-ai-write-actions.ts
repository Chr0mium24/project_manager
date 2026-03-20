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
        onInput: (event: Event) => {
          props.setPrompt((event.target as HTMLTextAreaElement).value);
        }
      })
    ]),
    h("div", { class: "pm-actions pm-actions-end" }, [
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
        props.isBusy ? "Running..." : "Enqueue Task"
      )
    ])
  ]);
}

export function renderAiWriteActions(props: ProjectAiWriteActionsProps): VNode {
  return h("details", { class: "pm-card pm-details" }, [
    h("summary", "Write actions"),
    h("div", { class: "pm-details-body" }, [
      h(
        "p",
        { class: "pm-inline-note" },
        "Use this section only when you want to enqueue a new task or apply a completed one. The main section above stays focused on review."
      ),
      renderWriteAccessFields(
        props.adminToken,
        (value) => {
          props.setAdminToken(value);
        },
        "Required only for AI task creation and apply on this route."
      ),
      h("div", { class: "pm-stack" }, [
        h("div", { class: "pm-card-head" }, [
          h("div", { class: "pm-page-copy" }, [
            h("h3", { class: "pm-section-title" }, "New task"),
            h("p", { class: "pm-copy" }, "Open the composer only when you need a new prompt.")
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
            props.composeOpen ? "Hide Composer" : "New Task"
          )
        ]),
        renderAiComposer(props)
      ]),
      !props.canApplySelectedTask
        ? renderStatusMessage("Select a completed task above before applying it.")
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
              props.isBusy ? "Applying..." : "Apply Selected"
            )
          ])
    ])
  ]);
}
