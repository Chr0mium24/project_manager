import { h, type VNode } from "vue";
import { renderStatusMessage } from "./project-manager-view-shared.ts";

export interface ProjectVersionsWriteActionsProps {
  selectedVersionId: string;
  composeOpen: boolean;
  restoreConfirmed: boolean;
  message: string;
  isBusy: boolean;
  setMessage(value: string): void;
  setRestoreConfirmed(value: boolean): void;
  toggleComposer(): void;
  createVersion(): void;
  restoreSelectedVersion(): void;
}

function renderVersionsComposer(props: ProjectVersionsWriteActionsProps): VNode | null {
  if (!props.composeOpen) {
    return null;
  }

  return h("div", { class: "pm-form-grid" }, [
    h("label", { class: "pm-field pm-field-full" }, [
      h("span", "Snapshot message"),
      h("input", {
        class: "pm-input",
        value: props.message,
        placeholder: "Describe this checkpoint",
        onInput: (event: Event) => {
          props.setMessage((event.target as HTMLInputElement).value);
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
            props.createVersion();
          }
        },
        props.isBusy ? "Creating..." : "Create snapshot"
      )
    ])
  ]);
}

export function renderVersionsWriteActions(props: ProjectVersionsWriteActionsProps): VNode {
  return h("section", { class: "pm-card pm-stack" }, [
    h("div", { class: "pm-card-head" }, [
      h("div", { class: "pm-page-copy" }, [
        h("h2", { class: "pm-section-title" }, "Snapshot actions"),
        h(
          "p",
          { class: "pm-copy" },
          "Write actions are global-token protected. Use the header Admin access entry when you need create or restore."
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
        props.composeOpen ? "Hide create form" : "New snapshot"
      )
    ]),
    renderVersionsComposer(props),
    props.selectedVersionId.length === 0
      ? renderStatusMessage("Select a snapshot in the history panel before restoring.")
      : h("div", { class: "pm-stack" }, [
          h("p", { class: "pm-selection-note" }, "Restore is destructive. Review uses file names only, not content diff."),
          h("label", { class: "pm-checkbox" }, [
            h("input", {
              type: "checkbox",
              checked: props.restoreConfirmed,
              onChange: (event: Event) => {
                props.setRestoreConfirmed((event.target as HTMLInputElement).checked);
              }
            }),
            h("span", "I understand this restore decision is based on file-level review only.")
          ]),
          h("div", { class: "pm-actions pm-actions-end" }, [
            h(
              "button",
              {
                type: "button",
                class: "pm-button pm-button-ghost",
                disabled: props.isBusy || !props.restoreConfirmed,
                onClick: () => {
                  props.restoreSelectedVersion();
                }
              },
              props.isBusy ? "Restoring..." : "Restore snapshot"
            )
          ])
        ])
  ]);
}
