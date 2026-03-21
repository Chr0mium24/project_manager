import { h, type VNode } from "vue";
import { renderStatusMessage } from "./project-manager-view-shared.ts";

export interface ProjectAiWriteActionsProps {
  composeOpen: boolean;
  taskSlug: string;
  prompt: string;
  sandboxMode: "danger-full-access" | "workspace-write";
  isBusy: boolean;
  canApplySelectedTask: boolean;
  canContinueSelectedTask: boolean;
  continueTaskLabel: string | null;
  setTaskSlug(value: string): void;
  setPrompt(value: string): void;
  setSandboxMode(value: "danger-full-access" | "workspace-write"): void;
  openNewTaskComposer(): void;
  openFollowUpComposer(): void;
  createTask(): void;
  applySelectedTask(): void;
}

function renderAiComposer(props: ProjectAiWriteActionsProps): VNode | null {
  if (!props.composeOpen) {
    return null;
  }

  return h("div", { class: "pm-form-grid" }, [
    props.continueTaskLabel
      ? h("p", { class: "pm-muted-block pm-field-full" }, `Continuing ${props.continueTaskLabel}`)
      : null,
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
    h("label", { class: "pm-field" }, [
      h("span", "Sandbox"),
      h("select", {
        class: "pm-input",
        value: props.sandboxMode,
        onChange: (event: Event) => {
          props.setSandboxMode((event.target as HTMLSelectElement).value as ProjectAiWriteActionsProps["sandboxMode"]);
        }
      }, [
        h("option", { value: "workspace-write" }, "workspace-write"),
        h("option", { value: "danger-full-access" }, "danger-full-access")
      ])
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
          "Write actions are protected by the global admin token. Use the header Admin access entry when you need task creation or apply."
        )
      ]),
      h(
        "button",
        {
          type: "button",
          class: "pm-button pm-button-ghost",
          onClick: () => {
            props.openNewTaskComposer();
          }
        },
        props.composeOpen && props.continueTaskLabel === null ? "Hide task form" : "New task"
      ),
      props.canContinueSelectedTask
        ? h(
            "button",
            {
              type: "button",
              class: "pm-button pm-button-ghost",
              onClick: () => {
                props.openFollowUpComposer();
              }
            },
            props.continueTaskLabel === null ? "Follow up selected" : "Editing follow-up"
          )
        : null
    ]),
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
