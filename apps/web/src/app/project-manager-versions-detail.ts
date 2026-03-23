import { h, type VNode } from "vue";
import type { ProjectVersionDiff, ProjectVersionRecord } from "../gateway-api.ts";
import { renderStatusMessage } from "./project-manager-view-shared.ts";

interface VersionDetailRenderProps {
  diff: ProjectVersionDiff | null;
  selectedVersionId: string;
  versions: ProjectVersionRecord[];
}

function countChanges(diff: ProjectVersionDiff, kind: ProjectVersionDiff["changes"][number]["kind"]): number {
  return diff.changes.filter((change) => change.kind === kind).length;
}

function renderGroupedChanges(diff: ProjectVersionDiff): VNode[] {
  return (["modified", "added", "deleted"] as const).map((kind) => {
    const matchingChanges = diff.changes.filter((change) => change.kind === kind);
    return h("section", { class: "pm-review-group" }, [
      h("div", { class: "pm-project-title-row" }, [
        h("h3", { class: "pm-project-title" }, `${kind} files`),
        h("span", { class: "pm-badge" }, String(matchingChanges.length))
      ]),
      matchingChanges.length === 0
        ? renderStatusMessage(`No ${kind} files in this snapshot.`)
        : h(
            "ul",
            { class: "pm-focus-list" },
            matchingChanges.map((change) => h("li", { class: "pm-focus-item" }, change.path))
          )
    ]);
  });
}

export function renderVersionDetail(props: VersionDetailRenderProps): VNode {
  if (props.selectedVersionId.length === 0) {
    return h("section", { class: "pm-card pm-subcard" }, [
      renderStatusMessage("Select a snapshot to inspect its diff.")
    ]);
  }
  if (props.diff === null) {
    return h("section", { class: "pm-card pm-subcard" }, [renderStatusMessage("Loading diff...")]);
  }

  const selectedVersion = props.versions.find((version) => version.versionId === props.selectedVersionId) ?? null;

  return h("section", { class: "pm-card pm-subcard pm-review-panel" }, [
    h("div", { class: "pm-stack" }, [
      h("div", { class: "pm-badge-row" }, [
        h("span", { class: "pm-badge" }, props.selectedVersionId),
        selectedVersion === null ? null : h("p", { class: "pm-kicker" }, selectedVersion.createdAt),
        props.diff.baseVersionId ? h("span", { class: "pm-badge" }, `Base ${props.diff.baseVersionId}`) : null
      ]),
      h(
        "p",
        { class: "pm-copy" },
        selectedVersion === null
          ? `${String(props.diff.changedFiles)} file changes against the current project.`
          : `${selectedVersion.message} · ${String(props.diff.changedFiles)} file changes against the current project.`
      )
    ]),
    h("section", { class: "pm-review-note pm-stack" }, [
      h("h3", { class: "pm-section-title" }, "Restore review level"),
      h(
        "p",
        { class: "pm-copy" },
        "This UI only shows file-level change names before restore. It does not provide line-by-line content diff yet, so this is still a low-confidence destructive review."
      )
    ]),
    h("div", { class: "pm-review-summary" }, [
      h("span", { class: "pm-badge" }, `${String(props.diff.changedFiles)} total`),
      h("span", { class: "pm-badge" }, `${String(countChanges(props.diff, "modified"))} modified`),
      h("span", { class: "pm-badge" }, `${String(countChanges(props.diff, "added"))} added`),
      h("span", { class: "pm-badge" }, `${String(countChanges(props.diff, "deleted"))} deleted`)
    ]),
    props.diff.changes.length === 0
      ? renderStatusMessage("No changes against the current project.")
      : h("div", { class: "pm-review-groups" }, renderGroupedChanges(props.diff))
  ]);
}
