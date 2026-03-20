import { h, type VNode } from "vue";
import { renderStatusMessage, renderWriteAccessFields } from "./project-manager-view-shared.ts";

export interface ProjectVersionsWriteActionsProps {
  adminToken: string;
  selectedVersionId: string;
  composeOpen: boolean;
  message: string;
  isBusy: boolean;
  setAdminToken(value: string): void;
  setMessage(value: string): void;
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
          "Create a new checkpoint or restore the selected one. These are the only write actions on this page."
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
    renderWriteAccessFields(
      props.adminToken,
      (value) => {
        props.setAdminToken(value);
      },
      "Required only for creating snapshots and restoring a selected version."
    ),
    renderVersionsComposer(props),
    props.selectedVersionId.length === 0
      ? renderStatusMessage("Select a snapshot in the history panel before restoring.")
      : h("div", { class: "pm-actions pm-actions-end" }, [
          h(
            "button",
            {
              type: "button",
              class: "pm-button pm-button-ghost",
              disabled: props.isBusy,
              onClick: () => {
                props.restoreSelectedVersion();
              }
            },
            props.isBusy ? "Restoring..." : "Restore selected"
          )
        ])
  ]);
}
