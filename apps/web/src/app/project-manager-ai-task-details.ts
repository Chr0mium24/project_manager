import { h, type Ref, type VNode } from "vue";
import { type AiTaskDiagnostics, type AiTaskRecord, type ManagedTaskSummary } from "../ai-task-api.ts";
import { renderStatusMessage } from "./project-manager-view-shared.ts";

interface AiTaskDetailsState {
  diagnostics: Ref<AiTaskDiagnostics | null>;
  selectedTask: Ref<AiTaskRecord | null>;
  summary: Ref<ManagedTaskSummary | null>;
}

function renderTaskMetadata(task: AiTaskRecord, diagnostics: AiTaskDiagnostics | null): VNode | null {
  const sessionId = diagnostics?.sessionId ?? null;
  const exitCode = diagnostics?.codexExitCode ?? null;
  const items = [
    task.parentTaskId ? h("code", `Parent ${task.parentTaskId}`) : null,
    sessionId ? h("code", `Session ${sessionId}`) : null,
    exitCode !== null ? h("code", `Exit ${String(exitCode)}`) : null
  ].filter((item): item is VNode => item !== null);

  if (items.length === 0) {
    return null;
  }

  return h("div", { class: "pm-code-list" }, items);
}

function renderTaskChanges(state: AiTaskDetailsState): VNode {
  const { summary } = state;
  if (summary.value === null) {
    return renderStatusMessage("No summary artifact yet. Inspect diagnostics below.");
  }

  return h(
    "ul",
    { class: "pm-list" },
    summary.value.changes.length === 0
      ? [h("li", { class: "pm-focus-item" }, "No changed files in the summary artifact.")]
      : summary.value.changes.map((change) =>
          h("li", { class: "pm-focus-item" }, `${change.kind} · ${change.path}`)
        )
  );
}

function renderLogBlock(title: string, value: string): VNode | null {
  if (value.trim().length === 0) {
    return null;
  }

  return h("details", { class: "pm-log-block" }, [
    h("summary", { class: "pm-log-summary" }, title),
    h("pre", { class: "pm-log-pre" }, value)
  ]);
}

function renderTaskDiagnostics(diagnostics: AiTaskDiagnostics | null): VNode | null {
  if (diagnostics === null) {
    return null;
  }

  const blocks = [
    diagnostics.error ? renderStatusMessage(diagnostics.error, "error") : null,
    renderLogBlock("stderr", diagnostics.stderr),
    renderLogBlock("stdout", diagnostics.stdout)
  ].filter((item): item is VNode => item !== null);

  if (blocks.length === 0) {
    return null;
  }

  return h("div", { class: "pm-stack" }, [
    h("h3", { class: "pm-section-title" }, "Diagnostics"),
    ...blocks
  ]);
}

export function renderAiTaskSummaryPanel(state: AiTaskDetailsState): VNode {
  if (state.selectedTask.value === null) {
    return h("section", { class: "pm-card pm-subcard" }, [
      renderStatusMessage("Select a task to inspect its summary.")
    ]);
  }

  const task = state.selectedTask.value;
  const diagnostics = state.diagnostics.value;

  return h("section", { class: "pm-card pm-subcard" }, [
    h("div", { class: "pm-stack" }, [
      h("div", { class: "pm-badge-row" }, [
        h("span", { class: "pm-badge" }, task.status),
        h("p", { class: "pm-kicker" }, task.createdAt)
      ]),
      h("p", { class: "pm-copy" }, task.taskSlug),
      task.appliedAt ? h("p", { class: "pm-copy" }, `Applied at ${task.appliedAt}`) : null,
      renderTaskMetadata(task, diagnostics),
      renderTaskChanges(state),
      renderTaskDiagnostics(diagnostics)
    ])
  ]);
}
