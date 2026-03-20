import { h, type VNode } from "vue";
import { renderSectionHeader, renderStatusMessage, renderWriteAccessFields } from "./project-manager-view-shared.ts";

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
    h("label", { class: "pm-field" }, [
      h("span", "Snapshot message"),
      h("input", {
        class: "pm-input",
        value: props.message,
        onInput: (event: Event) => {
          props.setMessage((event.target as HTMLInputElement).value);
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
            props.createVersion();
          }
        },
        props.isBusy ? "Saving..." : "Create Snapshot"
      )
    ])
  ]);
}

export function renderVersionsWriteActions(props: ProjectVersionsWriteActionsProps): VNode {
  return h("details", { class: "pm-card pm-details" }, [
    h("summary", "Write actions"),
    h("div", { class: "pm-details-body" }, [
      h(
        "p",
        { class: "pm-inline-note" },
        "Use this section only when you want to change snapshot state. The main section above stays focused on review."
      ),
      renderWriteAccessFields(
        props.adminToken,
        (value) => {
          props.setAdminToken(value);
        },
        "Required only for creating snapshots and restoring a selected version."
      ),
      h("div", { class: "pm-stack" }, [
        renderSectionHeader(
          "Create snapshot",
          "Open the composer only when you need a new checkpoint.",
          h(
            "button",
            {
              type: "button",
              class: "pm-button pm-button-ghost",
              onClick: () => {
                props.toggleComposer();
              }
            },
            props.composeOpen ? "Hide Composer" : "New Snapshot"
          )
        ),
        renderVersionsComposer(props)
      ]),
      props.selectedVersionId.length === 0
        ? renderStatusMessage("Select a snapshot above before attempting restore.")
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
              props.isBusy ? "Restoring..." : "Restore Selected"
            )
          ])
    ])
  ]);
}
