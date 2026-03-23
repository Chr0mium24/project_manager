import { h, type VNode } from "vue";
import type { ProjectFileMutationResult, ProjectFileTreeNode } from "../gateway-api.ts";
import { ProjectManagerAceEditor } from "./project-manager-ace-editor.ts";
import { renderPageHeader, renderSectionHeader, renderStatusMessage } from "./project-manager-view-shared.ts";

function shouldCollapseWorkspaceNav(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 1040px)").matches;
}

function renderTree(node: ProjectFileTreeNode, selectedFilePath: string, onSelect: (filePath: string) => void): VNode {
  if (node.kind === "file") {
    return h("li", [
      h("button", {
        type: "button",
        class: ["pm-tree-button", selectedFilePath === node.path ? "is-active" : ""],
        onClick: () => {
          onSelect(node.path);
        }
      }, [h("span", node.name), h("small", `${String(node.size)}b`)])
    ]);
  }

  return h("li", [
    h("div", { class: "pm-tree-dir" }, node.path.length === 0 ? "workspace" : node.name),
    h("ul", { class: "pm-tree-list" }, node.children.map((child) => renderTree(child, selectedFilePath, onSelect)))
  ]);
}

function renderMutationResult(result: ProjectFileMutationResult | null): VNode | null {
  if (result === null) {
    return null;
  }

  return h("div", { class: "pm-stack" }, [
    h("p", { class: "pm-muted-block" }, result.checks === null
      ? `Updated ${result.path}`
      : `${result.checks.ok ? "Checks passed" : "Checks failed"} after saving ${result.path}`),
    result.checks === null
      ? null
      : h("details", { class: "pm-log-block" }, [
          h("summary", { class: "pm-log-summary" }, `${result.checks.command} · ${String(result.checks.durationMs)}ms`),
          h("pre", { class: "pm-log-pre" }, [result.checks.stdout, result.checks.stderr].filter(Boolean).join("\n"))
        ])
  ]);
}

export interface WorkspaceRenderProps {
  editorError: string | null;
  error: string | null;
  fileContent: string | null;
  fileDraft: string;
  isCreating: boolean;
  isDeleting: boolean;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  lastMutation: ProjectFileMutationResult | null;
  navOpen: boolean;
  newFilePath: string;
  projectSlug: string;
  publicHref: string | null;
  selectedFilePath: string;
  tree: { children: ProjectFileTreeNode[] } | null;
  createFile(): void;
  deleteFile(): void;
  loadFile(filePath: string): void;
  saveFile(): void;
  setEditorDraft(value: string): void;
  setEditorError(message: string): void;
  setNavOpen(value: boolean): void;
  setNewFilePath(value: string): void;
}

function renderWorkspaceEditor(props: WorkspaceRenderProps): VNode {
  if (props.selectedFilePath.length === 0) {
    return renderStatusMessage("Select a file from the tree to inspect its contents.");
  }
  if (props.fileContent === null) {
    return renderStatusMessage("Loading file...");
  }
  return h("div", { class: "pm-editor-stack" }, [
    h("div", { class: "pm-editor-head" }, [
      h("div", { class: "pm-editor-file-copy" }, [
        h("p", { class: "pm-section-title" }, "Editing file"),
        h("p", { class: "pm-editor-file-path" }, props.selectedFilePath),
        h(
          "p",
          { class: "pm-selection-note" },
          props.navOpen ? "File tree stays open while you edit." : "File tree is hidden so the editor can take the viewport."
        )
      ]),
      h("div", { class: "pm-actions pm-actions-end" }, [
        h("button", {
          type: "button",
          class: "pm-button",
          disabled: props.isSaving || !props.isDirty,
          onClick: () => {
            props.saveFile();
          }
        }, props.isSaving ? "Saving..." : "Save file")
      ])
    ]),
    h("div", { class: "pm-toolbar" }, [
      h("label", { class: "pm-field pm-field-grow" }, [
        h("span", "New file"),
        h("input", {
          class: "pm-input",
          value: props.newFilePath,
          placeholder: "src/components/panel.ts",
          onInput: (event: Event) => {
            props.setNewFilePath((event.target as HTMLInputElement).value);
          }
        })
      ]),
      h("button", {
        type: "button",
        class: "pm-project-link",
        disabled: props.isCreating,
        onClick: () => {
          props.createFile();
        }
      }, props.isCreating ? "Creating..." : "Create file"),
      h("button", {
        type: "button",
        class: "pm-project-link",
        disabled: props.isDeleting,
        onClick: () => {
          props.deleteFile();
        }
      }, props.isDeleting ? "Deleting..." : "Delete file")
    ]),
    h(ProjectManagerAceEditor, {
      filePath: props.selectedFilePath,
      modelValue: props.fileDraft,
      onLoadError: (message: string) => {
        props.setEditorError(message);
      },
      "onUpdate:modelValue": (value: string) => {
        props.setEditorDraft(value);
      }
    }),
    props.editorError ? renderStatusMessage(props.editorError, "error") : null,
    renderMutationResult(props.lastMutation)
  ]);
}

function renderWorkspaceBody(props: WorkspaceRenderProps): VNode {
  if (props.isLoading && props.tree === null) {
    return renderStatusMessage("Loading workspace...");
  }

  return h("div", { class: ["pm-workspace-grid", props.navOpen ? "" : "is-focused"] }, [
    props.navOpen
      ? h("aside", { class: "pm-card pm-subcard pm-workspace-nav" }, [
          props.tree === null
            ? renderStatusMessage("No workspace tree available.")
            : h("ul", { class: "pm-tree-list" }, props.tree.children.map((node) =>
                renderTree(node, props.selectedFilePath, (filePath) => {
                  props.loadFile(filePath);
                  if (shouldCollapseWorkspaceNav()) {
                    props.setNavOpen(false);
                  }
                })
              ))
        ])
      : null,
    h("section", { class: "pm-card pm-subcard pm-editor-shell" }, [renderWorkspaceEditor(props)])
  ]);
}

export function renderWorkspaceView(props: WorkspaceRenderProps): VNode {
  return h("div", { class: "pm-view", "data-view": "workspace" }, [
    renderPageHeader({
      projectSlug: props.projectSlug,
      currentView: "workspace",
      title: "Repository workspace",
      description: "Browse repository files, edit the selected file, and save changes back to the managed project.",
      action: props.publicHref ? h("a", { href: props.publicHref, class: "pm-project-link" }, "Open page") : null
    }),
    h("section", { class: "pm-card pm-workspace-card" }, [
      renderSectionHeader(
        "Files",
        props.selectedFilePath
          ? `Editing ${props.selectedFilePath}. Use Show files to switch context without losing the current editor draft.`
          : "Choose a file from the repository tree, then edit it in the main panel.",
        h("button", {
          type: "button",
          class: "pm-button pm-button-ghost",
          onClick: () => {
            props.setNavOpen(!props.navOpen);
          }
        }, props.navOpen ? "Hide tree" : "Show tree")
      ),
      props.error ? renderStatusMessage(props.error, "error") : null,
      renderWorkspaceBody(props)
    ])
  ]);
}
