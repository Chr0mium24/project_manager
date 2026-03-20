import { GatewayApiError } from "./ai-task-api.ts";

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

interface GatewayApiClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
}

function readErrorCode(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }

  const errorCode = (payload as Record<string, unknown>).error;
  return typeof errorCode === "string" ? errorCode : null;
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

function parseProjectListEntry(value: unknown): ProjectListEntry {
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

function parseManagedProjectRecord(value: unknown): ManagedProjectRecord {
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

function parseProjectFileTreeNode(value: unknown): ProjectFileTreeNode {
  const record = expectRecord(value, "project file tree node");
  const kind = expectString(record.kind, "project file tree kind");
  if (kind === "directory") {
    return {
      kind,
      name: expectString(record.name, "project file tree directory name"),
      path: expectString(record.path, "project file tree directory path"),
      children: expectArray(record.children, "project file tree directory children")
        .map((child) => parseProjectFileTreeNode(child))
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

function parseProjectVersionRecord(value: unknown): ProjectVersionRecord {
  const record = expectRecord(value, "project version");
  return {
    slug: expectString(record.slug, "project version slug"),
    versionId: expectString(record.versionId, "project version versionId"),
    message: expectString(record.message, "project version message"),
    createdAt: expectString(record.createdAt, "project version createdAt"),
    snapshotPath: expectString(record.snapshotPath, "project version snapshotPath")
  };
}

function parseProjectVersionDiff(value: unknown): ProjectVersionDiff {
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

export class GatewayProjectApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  public constructor(options: GatewayApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "";
    this.fetchImpl = options.fetch ?? fetch;
  }

  public async listProjects(): Promise<ProjectListEntry[]> {
    const payload = expectRecord(await this.requestJson("/api/projects"), "project list payload");
    return expectArray(payload.projects, "project list").map((project) => parseProjectListEntry(project));
  }

  public async readProject(slug: string): Promise<ManagedProjectRecord> {
    return parseManagedProjectRecord(await this.requestJson(`/api/projects/${slug}`));
  }

  public async readProjectFileTree(slug: string): Promise<ProjectFileTreeDirectoryNode> {
    const payload = expectRecord(await this.requestJson(`/api/projects/${slug}/file-tree`), "project file tree payload");
    return parseProjectFileTreeNode(payload.tree) as ProjectFileTreeDirectoryNode;
  }

  public async readProjectFile(slug: string, filePath: string): Promise<string> {
    const payload = expectRecord(
      await this.requestJson(`/api/projects/${slug}/file?path=${encodeURIComponent(filePath)}`),
      "project file payload"
    );
    return expectString(payload.content, "project file content");
  }

  public async writeProjectFile(
    slug: string,
    filePath: string,
    content: string,
    adminToken: string
  ): Promise<void> {
    await this.requestJson(`/api/projects/${slug}/file`, {
      method: "PUT",
      headers: this.requestHeaders(adminToken),
      body: JSON.stringify({
        path: filePath,
        content
      })
    });
  }

  public async listVersions(slug: string): Promise<ProjectVersionRecord[]> {
    const payload = expectRecord(await this.requestJson(`/api/projects/${slug}/versions`), "project version list payload");
    return expectArray(payload.versions, "project version list").map((version) => parseProjectVersionRecord(version));
  }

  public async createVersion(slug: string, message: string, adminToken: string): Promise<ProjectVersionRecord> {
    const payload = expectRecord(
      await this.requestJson(`/api/projects/${slug}/versions`, {
        method: "POST",
        headers: this.requestHeaders(adminToken),
        body: JSON.stringify({ message })
      }),
      "project version create payload"
    );
    return parseProjectVersionRecord(payload.version);
  }

  public async readVersionDiff(slug: string, versionId: string): Promise<ProjectVersionDiff> {
    const payload = expectRecord(
      await this.requestJson(`/api/projects/${slug}/versions/${versionId}/diff`),
      "project version diff payload"
    );
    return parseProjectVersionDiff(payload.diff);
  }

  public async restoreVersion(slug: string, versionId: string, adminToken: string): Promise<ProjectVersionRecord> {
    const payload = expectRecord(
      await this.requestJson(`/api/projects/${slug}/versions/${versionId}/restore`, {
        method: "POST",
        headers: this.requestHeaders(adminToken)
      }),
      "project version restore payload"
    );
    return parseProjectVersionRecord(payload.restoredVersion);
  }

  private async requestJson(pathname: string, init: RequestInit = {}): Promise<unknown> {
    const response = await this.fetchImpl(this.resolveUrl(pathname), init);
    const payload: unknown = await response.json();
    if (!response.ok) {
      throw new GatewayApiError(response.status, readErrorCode(payload));
    }
    return payload;
  }

  private requestHeaders(adminToken: string): Record<string, string> {
    return {
      authorization: `Bearer ${adminToken}`,
      "content-type": "application/json"
    };
  }

  private resolveUrl(pathname: string): string {
    if (this.baseUrl.length > 0) {
      return new URL(pathname, this.baseUrl).toString();
    }
    if (typeof window !== "undefined") {
      return new URL(pathname, window.location.origin).toString();
    }
    return pathname;
  }
}
