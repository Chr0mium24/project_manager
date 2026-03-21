import type { AiTaskSandboxMode } from "./ai-task-api.ts";

export interface ProjectListEntry {
  slug: string;
  path: string;
  name: string;
  runtime: "static" | "dynamic";
  visibility: "private" | "public";
  entry: string;
  route: string;
  updatedAt: string;
}

export interface ManagedProjectRecord extends ProjectListEntry {
  schemaVersion: 1;
  description: string;
  tags: string[];
  latestVersion: string;
  mainLanguage: string;
  framework: string;
  owner: string;
  createdAt: string;
}

export interface ProjectMutationChecksResult {
  command: string;
  durationMs: number;
  exitCode: number | null;
  ok: boolean;
  stdout: string;
  stderr: string;
}

export interface ProjectCreateInput {
  slug: string;
  name: string;
  runtime: "static" | "dynamic";
  visibility?: "private" | "public";
  description?: string;
  aiPrompt?: string;
  aiTaskSlug?: string;
  sandboxMode?: AiTaskSandboxMode;
  force?: boolean;
  runChecks?: boolean;
}

export interface ProjectCreateResult {
  project: ManagedProjectRecord;
  task: {
    taskId: string;
    projectSlug: string;
    taskSlug: string;
    status: string;
  } | null;
  checks: ProjectMutationChecksResult | null;
}

export interface ProjectFileMutationResult {
  path: string;
  updatedAt: string;
  size?: number;
  checks: ProjectMutationChecksResult | null;
}

export interface ProjectFileTreeFileNode {
  kind: "file";
  name: string;
  path: string;
  size: number;
}

export interface ProjectFileTreeDirectoryNode {
  kind: "directory";
  name: string;
  path: string;
  children: ProjectFileTreeNode[];
}

export type ProjectFileTreeNode = ProjectFileTreeDirectoryNode | ProjectFileTreeFileNode;

export interface ProjectVersionRecord {
  slug: string;
  versionId: string;
  message: string;
  createdAt: string;
  snapshotPath: string;
}

export interface ProjectVersionDiff {
  slug: string;
  versionId: string;
  baseVersionId: string | null;
  changedFiles: number;
  changes: Array<{
    path: string;
    kind: "added" | "deleted" | "modified";
  }>;
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`invalid ${label}`);
  }

  return value as Record<string, unknown>;
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`invalid ${label}`);
  }

  return value;
}

function expectArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`invalid ${label}`);
  }

  return value;
}

function expectInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`invalid ${label}`);
  }

  return value;
}

function expectNullableString(value: unknown, label: string): string | null {
  if (value === null) {
    return null;
  }

  return expectString(value, label);
}

export function parseProjectListEntry(value: unknown): ProjectListEntry {
  const record = expectRecord(value, "project list entry");
  return {
    slug: expectString(record.slug, "project slug"),
    path: expectString(record.path, "project path"),
    name: expectString(record.name, "project name"),
    runtime: expectString(record.runtime, "project runtime") as ProjectListEntry["runtime"],
    visibility: expectString(record.visibility, "project visibility") as ProjectListEntry["visibility"],
    entry: expectString(record.entry, "project entry"),
    route: expectString(record.route, "project route"),
    updatedAt: expectString(record.updatedAt, "project updatedAt")
  };
}

export function parseManagedProjectRecord(value: unknown): ManagedProjectRecord {
  const record = expectRecord(value, "managed project");
  return {
    ...parseProjectListEntry(value),
    schemaVersion: expectInteger(record.schemaVersion, "managed project schemaVersion") as 1,
    description: expectString(record.description, "managed project description"),
    tags: expectArray(record.tags, "managed project tags").map((tag, index) =>
      expectString(tag, `managed project tag ${String(index)}`)
    ),
    latestVersion: expectString(record.latestVersion, "managed project latestVersion"),
    mainLanguage: expectString(record.mainLanguage, "managed project mainLanguage"),
    framework: expectString(record.framework, "managed project framework"),
    owner: expectString(record.owner, "managed project owner"),
    createdAt: expectString(record.createdAt, "managed project createdAt")
  };
}

export function parseProjectFileTreeNode(value: unknown): ProjectFileTreeNode {
  const record = expectRecord(value, "project file tree node");
  const kind = expectString(record.kind, "project file tree kind");
  if (kind === "directory") {
    return {
      kind,
      name: expectString(record.name, "project file tree directory name"),
      path: expectString(record.path, "project file tree directory path"),
      children: expectArray(record.children, "project file tree directory children").map(parseProjectFileTreeNode)
    };
  }

  if (kind === "file") {
    return {
      kind,
      name: expectString(record.name, "project file tree file name"),
      path: expectString(record.path, "project file tree file path"),
      size: expectInteger(record.size, "project file tree file size")
    };
  }

  throw new Error(`invalid project file tree kind: ${kind}`);
}

export function parseProjectVersionRecord(value: unknown): ProjectVersionRecord {
  const record = expectRecord(value, "project version");
  return {
    slug: expectString(record.slug, "project version slug"),
    versionId: expectString(record.versionId, "project version versionId"),
    message: expectString(record.message, "project version message"),
    createdAt: expectString(record.createdAt, "project version createdAt"),
    snapshotPath: expectString(record.snapshotPath, "project version snapshotPath")
  };
}

export function parseProjectVersionDiff(value: unknown): ProjectVersionDiff {
  const record = expectRecord(value, "project version diff");
  return {
    slug: expectString(record.slug, "project version diff slug"),
    versionId: expectString(record.versionId, "project version diff versionId"),
    baseVersionId: expectNullableString(record.baseVersionId, "project version diff baseVersionId"),
    changedFiles: expectInteger(record.changedFiles, "project version diff changedFiles"),
    changes: expectArray(record.changes, "project version diff changes").map((change, index) => {
      const entry = expectRecord(change, `project version diff change ${String(index)}`);
      return {
        path: expectString(entry.path, `project version diff change ${String(index)} path`),
        kind: expectString(entry.kind, `project version diff change ${String(index)} kind`) as
          ProjectVersionDiff["changes"][number]["kind"]
      };
    })
  };
}

export function parseNullableProjectMutationChecks(value: unknown): ProjectMutationChecksResult | null {
  if (value === null || value === undefined) {
    return null;
  }

  const record = expectRecord(value, "project mutation checks");
  return {
    command: expectString(record.command, "project mutation checks command"),
    durationMs: expectInteger(record.durationMs, "project mutation checks durationMs"),
    exitCode: record.exitCode === null ? null : expectInteger(record.exitCode, "project mutation checks exitCode"),
    ok: record.ok === true,
    stdout: typeof record.stdout === "string" ? record.stdout : "",
    stderr: typeof record.stderr === "string" ? record.stderr : ""
  };
}

export function parseProjectTaskRef(value: unknown): ProjectCreateResult["task"] {
  if (value === null || value === undefined) {
    return null;
  }

  const record = expectRecord(value, "project create task");
  return {
    taskId: expectString(record.taskId, "project create taskId"),
    projectSlug: expectString(record.projectSlug, "project create projectSlug"),
    taskSlug: expectString(record.taskSlug, "project create taskSlug"),
    status: expectString(record.status, "project create task status")
  };
}
