import { GatewayApiError } from "./ai-task-api.ts";
import {
  parseManagedProjectRecord,
  parseNullableProjectMutationChecks,
  parseProjectFileTreeNode,
  parseProjectListEntry,
  parseProjectTaskRef,
  parseProjectVersionDiff,
  parseProjectVersionRecord,
  type ManagedProjectRecord,
  type ProjectCreateInput,
  type ProjectCreateResult,
  type ProjectFileMutationResult,
  type ProjectFileTreeDirectoryNode,
  type ProjectListEntry,
  type ProjectVersionDiff,
  type ProjectVersionRecord
} from "./gateway-api-models.ts";

export type {
  ManagedProjectRecord,
  ProjectCreateInput,
  ProjectCreateResult,
  ProjectFileMutationResult,
  ProjectFileTreeDirectoryNode,
  ProjectFileTreeFileNode,
  ProjectFileTreeNode,
  ProjectListEntry,
  ProjectMutationChecksResult,
  ProjectVersionDiff,
  ProjectVersionRecord
} from "./gateway-api-models.ts";

interface GatewayApiClientOptions {
  baseUrl?: string;
  adminToken?: string;
  fetch?: typeof fetch;
}

function resolveFetch(fetchImpl?: typeof fetch): typeof fetch {
  if (fetchImpl !== undefined) {
    return fetchImpl;
  }

  if (typeof globalThis.fetch !== "function") {
    throw new Error("global fetch is unavailable");
  }

  return globalThis.fetch.bind(globalThis);
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

export class GatewayProjectApiClient {
  private readonly baseUrl: string;
  private readonly adminToken: string | null;
  private readonly fetchImpl: typeof fetch;

  public constructor(options: GatewayApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "";
    this.adminToken = options.adminToken?.trim() || null;
    this.fetchImpl = resolveFetch(options.fetch);
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

  public async writeProjectFile(input: {
    slug: string;
    filePath: string;
    content: string;
    adminToken: string;
    runChecks?: boolean;
  }): Promise<ProjectFileMutationResult> {
    const payload = expectRecord(await this.requestJson(`/api/projects/${input.slug}/file`, {
      method: "PUT",
      headers: this.requestHeaders(input.adminToken, true),
      body: JSON.stringify({
        path: input.filePath,
        content: input.content,
        runChecks: input.runChecks
      })
    }), "project file write payload");
    return {
      path: expectString(payload.path, "project file write path"),
      size: expectInteger(payload.size, "project file write size"),
      updatedAt: expectString(payload.updatedAt, "project file write updatedAt"),
      checks: parseNullableProjectMutationChecks(payload.checks)
    };
  }

  public async deleteProjectFile(
    slug: string,
    filePath: string,
    adminToken: string,
    options: { runChecks?: boolean } = {}
  ): Promise<ProjectFileMutationResult> {
    const payload = expectRecord(await this.requestJson(
      `/api/projects/${slug}/file?path=${encodeURIComponent(filePath)}&runChecks=${options.runChecks === true ? "true" : "false"}`,
      {
        method: "DELETE",
        headers: this.requestHeaders(adminToken)
      }
    ), "project file delete payload");
    return {
      path: expectString(payload.path, "project file delete path"),
      updatedAt: expectString(payload.updatedAt, "project file delete updatedAt"),
      checks: parseNullableProjectMutationChecks(payload.checks)
    };
  }

  public async createProject(input: ProjectCreateInput, adminToken: string): Promise<ProjectCreateResult> {
    const payload = expectRecord(await this.requestJson("/api/projects", {
      method: "POST",
      headers: this.requestHeaders(adminToken, true),
      body: JSON.stringify(input)
    }), "project create payload");
    return {
      project: parseManagedProjectRecord(payload.project),
      task: parseProjectTaskRef(payload.task),
      checks: parseNullableProjectMutationChecks(payload.checks)
    };
  }

  public async deleteProject(slug: string, adminToken: string): Promise<ManagedProjectRecord> {
    const payload = expectRecord(await this.requestJson(`/api/projects/${slug}`, {
      method: "DELETE",
      headers: this.requestHeaders(adminToken)
    }), "project delete payload");
    return parseManagedProjectRecord(payload.project);
  }

  public async listVersions(slug: string): Promise<ProjectVersionRecord[]> {
    const payload = expectRecord(await this.requestJson(`/api/projects/${slug}/versions`), "project version list payload");
    return expectArray(payload.versions, "project version list").map((version) => parseProjectVersionRecord(version));
  }

  public async createVersion(slug: string, message: string, adminToken: string): Promise<ProjectVersionRecord> {
    const payload = expectRecord(
      await this.requestJson(`/api/projects/${slug}/versions`, {
        method: "POST",
        headers: this.requestHeaders(adminToken, true),
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

  public async verifyAdminSession(adminToken: string = this.requireAdminToken()): Promise<void> {
    await this.requestJson("/api/admin/session", {
      method: "POST",
      headers: this.requestHeaders(adminToken)
    });
  }

  public async probeAdminAccess(): Promise<"available" | "unavailable"> {
    const response = await this.fetchImpl(this.resolveUrl("/api/admin/session"), {
      method: "POST"
    });
    const payload: unknown = await response.json();
    if (response.ok) {
      return "available";
    }

    const errorCode = readErrorCode(payload);
    if (response.status === 401 && errorCode === "unauthorized") {
      return "available";
    }
    if (response.status === 503 && errorCode === "auth-not-configured") {
      return "unavailable";
    }

    throw new GatewayApiError(response.status, errorCode);
  }

  private async requestJson(pathname: string, init: RequestInit = {}): Promise<unknown> {
    const response = await this.fetchImpl(this.resolveUrl(pathname), init);
    const payload: unknown = await response.json();
    if (!response.ok) {
      throw new GatewayApiError(response.status, readErrorCode(payload));
    }
    return payload;
  }

  private requestHeaders(adminToken: string, includeJsonContentType = false): Record<string, string> {
    return includeJsonContentType
      ? {
          authorization: `Bearer ${adminToken}`,
          "content-type": "application/json"
        }
      : {
          authorization: `Bearer ${adminToken}`
        };
  }

  private requireAdminToken(): string {
    if (this.adminToken === null) {
      throw new Error("admin token is required");
    }

    return this.adminToken;
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
