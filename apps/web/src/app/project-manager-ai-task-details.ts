import { h, type Ref, type VNode } from "vue";
import { type AiTaskDiagnostics, type AiTaskRecord, type ManagedTaskSummary } from "../ai-task-api.ts";
import { parseAiEventStream, type AiEventStreamEntry } from "./project-manager-ai-event-stream.ts";
import { findAiTaskSession } from "./project-manager-ai-sessions.ts";
import { renderStatusMessage } from "./project-manager-view-shared.ts";

interface AiTaskDetailsState {
  tasks: Ref<AiTaskRecord[]>;
  selectedTask: Ref<AiTaskRecord | null>;
  summariesByTaskId: Ref<Record<string, ManagedTaskSummary | null | undefined>>;
  diagnosticsByTaskId: Ref<Record<string, AiTaskDiagnostics | null | undefined>>;
}

function renderTaskMetadata(task: AiTaskRecord, diagnostics: AiTaskDiagnostics | null | undefined): VNode | null {
  const sessionId = diagnostics?.sessionId ?? task.sessionId ?? null;
  const exitCode = diagnostics?.codexExitCode ?? task.codexExitCode;
  const items = [
    task.parentTaskId ? h("code", `Parent ${task.parentTaskId}`) : null,
    sessionId ? h("code", `Session ${sessionId}`) : null,
    exitCode !== null ? h("code", `Exit ${String(exitCode)}`) : null
  ].filter((item): item is VNode => item !== null);

  return items.length === 0 ? null : h("div", { class: "pm-code-list" }, items);
}

function renderTaskChanges(summary: ManagedTaskSummary | null | undefined): VNode | null {
  if (summary === undefined) {
    return renderStatusMessage("Loading change summary...");
  }
  if (summary === null) {
    return null;
  }

  return h("section", { class: "pm-task-section" }, [
    h("h3", { class: "pm-section-title" }, "Changed files"),
    h("div", { class: "pm-review-summary" }, [
      h("span", { class: "pm-badge" }, `${String(summary.changedFiles)} total`)
    ]),
    summary.changes.length === 0
      ? renderStatusMessage("No changed files in the summary artifact.")
      : h(
          "details",
          { class: "pm-log-block" },
          [
            h("summary", { class: "pm-log-summary" }, "Open changed files"),
            h(
              "ul",
              { class: "pm-focus-list" },
              summary.changes.map((change) => h("li", { class: "pm-focus-item" }, `${change.kind} · ${change.path}`))
            )
          ]
        )
  ]);
}

function renderEntryDetails(entry: AiEventStreamEntry): VNode | null {
  if (entry.details.length === 0) {
    return null;
  }

  return h("details", { class: "pm-log-block", open: entry.autoCollapsed ? undefined : true }, [
    h("summary", { class: "pm-log-summary" }, `Read output · ${String(entry.details.length)} lines`),
    h("pre", { class: "pm-log-pre" }, entry.details.join("\n"))
  ]);
}

function renderEventStream(stdout: string): VNode | null {
  const entries = parseAiEventStream(stdout);
  if (entries === null) {
    return null;
  }

  return h(
    "ol",
    { class: "pm-event-timeline" },
    entries.map((entry) =>
      h("li", { class: "pm-event-row" }, [
        h("div", { class: ["pm-event-dot", entry.tone === "success" ? "is-success" : "", entry.tone === "error" ? "is-error" : ""] }),
        h("div", { class: "pm-event-body" }, [
          h("p", { class: "pm-event-title" }, entry.title),
          ...entry.body.map((line) => h("p", { class: "pm-event-copy" }, line)),
          renderEntryDetails(entry)
        ])
      ])
    )
  );
}

function renderTaskDiagnostics(diagnostics: AiTaskDiagnostics | null | undefined): VNode | null {
  if (diagnostics === undefined) {
    return renderStatusMessage("Loading task activity...");
  }
  if (diagnostics === null) {
    return null;
  }

  const eventStream = renderEventStream(diagnostics.stdout);
  const blocks = [
    diagnostics.error ? renderStatusMessage(diagnostics.error, "error") : null,
    eventStream,
    diagnostics.stderr.trim().length === 0
      ? null
      : h("details", { class: "pm-log-block" }, [
          h("summary", { class: "pm-log-summary" }, "stderr"),
          h("pre", { class: "pm-log-pre" }, diagnostics.stderr)
        ]),
    eventStream === null && diagnostics.stdout.trim().length > 0
      ? h("details", { class: "pm-log-block" }, [
          h("summary", { class: "pm-log-summary" }, "stdout"),
          h("pre", { class: "pm-log-pre" }, diagnostics.stdout)
        ])
      : null
  ].filter((item): item is VNode => item !== null);

  return blocks.length === 0
    ? null
    : h("details", { class: "pm-log-block" }, [
        h("summary", { class: "pm-log-summary" }, "Open raw activity"),
        h("div", { class: "pm-stack" }, blocks)
      ]);
}

function summarizeSessionChanges(state: AiTaskDetailsState, taskIds: string[]): number {
  return taskIds.reduce((total, taskId) => {
    const summary = state.summariesByTaskId.value[taskId];
    return total + (summary?.changedFiles ?? 0);
  }, 0);
}

function renderSessionOverview(
  state: AiTaskDetailsState,
  session: NonNullable<ReturnType<typeof findAiTaskSession>>
): VNode {
  const changedFiles = summarizeSessionChanges(state, session.tasks.map((task) => task.taskId));

  return h("section", { class: "pm-session-overview" }, [
    h("div", { class: "pm-card-head" }, [
      h("div", { class: "pm-page-copy" }, [
        h("h2", { class: "pm-section-title" }, session.title),
        h(
          "p",
          { class: "pm-copy" },
          session.status === "queued" || session.status === "running"
            ? `Session running with ${String(session.tasks.length)} turns.`
            : `Session completed after ${String(session.tasks.length)} turns.`
        )
      ]),
      h("span", { class: "pm-badge" }, session.status)
    ]),
    h("div", { class: "pm-session-stats" }, [
      h("div", { class: "pm-session-stat" }, [h("strong", String(session.tasks.length)), h("span", "Turns")]),
      h("div", { class: "pm-session-stat" }, [h("strong", String(changedFiles)), h("span", "Changed files across summaries")]),
      h("div", { class: "pm-session-stat" }, [h("strong", session.latestTask.status), h("span", "Latest task status")])
    ])
  ]);
}

function renderTaskTurn(task: AiTaskRecord, state: AiTaskDetailsState): VNode {
  const diagnostics = state.diagnosticsByTaskId.value[task.taskId];
  const summary = state.summariesByTaskId.value[task.taskId];
  const changeCount = summary?.changedFiles ?? 0;
  const endedLabel = task.status === "queued" || task.status === "running"
    ? null
    : task.completedAt ? `Ended ${task.completedAt}` : "Ended";

  return h("article", { class: "pm-card pm-task-turn" }, [
    h("div", { class: "pm-task-turn-head" }, [
      h("div", { class: "pm-badge-row" }, [
        h("span", { class: "pm-badge" }, task.status),
        h("p", { class: "pm-kicker" }, task.createdAt),
        summary ? h("span", { class: "pm-badge" }, `${String(changeCount)} changed`) : null
      ]),
      h("div", [
        h("span", { class: "pm-turn-title" }, task.taskSlug),
        h("span", { class: "pm-turn-preview" }, task.prompt)
      ])
    ]),
    h("details", { class: "pm-log-block" }, [
      h("summary", { class: "pm-log-summary" }, "Open task details"),
      h("div", { class: "pm-stack" }, [
        h("section", { class: "pm-task-section" }, [
          h("h3", { class: "pm-section-title" }, "Prompt"),
          h("p", { class: "pm-copy" }, task.prompt),
          endedLabel ? h("p", { class: "pm-muted-block" }, endedLabel) : null,
          task.appliedAt ? h("p", { class: "pm-muted-block" }, `Applied at ${task.appliedAt}`) : null
        ]),
        renderTaskMetadata(task, diagnostics),
        renderTaskChanges(summary),
        renderTaskDiagnostics(diagnostics)
      ])
    ])
  ]);
}

export function renderAiTaskSummaryPanel(state: AiTaskDetailsState): VNode {
  if (state.selectedTask.value === null) {
    return h("section", { class: "pm-card pm-subcard" }, [
      renderStatusMessage("Select a session to inspect its conversation.")
    ]);
  }

  const session = findAiTaskSession(state.tasks.value, state.selectedTask.value.taskId);
  if (session === null) {
    return h("section", { class: "pm-card pm-subcard" }, [
      renderStatusMessage("Selected session is unavailable.")
    ]);
  }

  return h("section", { class: "pm-card pm-subcard pm-stack" }, [
    renderSessionOverview(state, session),
    ...session.tasks.map((task) => renderTaskTurn(task, state))
  ]);
}
