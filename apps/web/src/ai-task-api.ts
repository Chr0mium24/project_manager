export type AiTaskStatus = "queued" | "running" | "completed" | "failed";

export interface AiTaskRecord {
  schemaVersion: 1;
  taskId: string;
  kind: "managed-project-edit";
  status: AiTaskStatus;
  projectSlug: string;
  taskSlug: string;
  prompt: string;
  parentTaskId: string | null;
  sessionId: string | null;
  createdAt: string;
  completedAt: string | null;
  managedTaskPath: string;
  workspaceProjectPath: string;
  stdoutPath: string | null;
  stderrPath: string | null;
  summaryPath: string | null;
  validationPath: string | null;
  codexExitCode: number | null;
  error: string | null;
  appliedAt: string | null;
}

export interface ManagedTaskSummary {
  projectSlug: string;
  taskSlug: string;
  generatedAt: string;
  changedFiles: number;
  changes: Array<{
    path: string;
    kind: "added" | "deleted" | "modified";
  }>;
}

export interface CreateAiTaskInput {
  projectSlug: string;
  taskSlug: string;
  prompt: string;
  force?: boolean;
  parentTaskId?: string;
}

export interface AiTaskDiagnostics {
  taskId: string;
  parentTaskId: string | null;
  sessionId: string | null;
  status: AiTaskStatus;
  codexExitCode: number | null;
  error: string | null;
  stdout: string;
  stderr: string;
}

export interface AiTaskApplyResult {
  projectSlug: string;
  taskSlug: string;
  changedFiles: number;
  status: "applied";
  lastAppliedAt: string;
}

export interface AiTaskClient {
  listTasks(): Promise<AiTaskRecord[]>;
  readTask(taskId: string): Promise<AiTaskRecord>;
  readSummary(taskId: string): Promise<ManagedTaskSummary>;
  readDiagnostics(taskId: string): Promise<AiTaskDiagnostics>;
  createTask(input: CreateAiTaskInput): Promise<AiTaskRecord>;
  applyTask(taskId: string): Promise<{ task: AiTaskRecord; result: AiTaskApplyResult }>;
  waitForTask(taskId: string, options?: WaitForAiTaskOptions): Promise<AiTaskRecord>;
}

export interface AiTaskApiClientOptions {
  adminToken?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

export interface WaitForAiTaskOptions {
  maxAttempts?: number;
  pollIntervalMs?: number;
}

export class GatewayApiError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly errorCode: string | null
  ) {
    super(errorCode === null ? `gateway request failed (${String(statusCode)})` : errorCode);
  }
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`invalid ${label}`);
  }

  return value as Record<string, unknown>;
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
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

function expectInt(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`invalid ${label}`);
  }

  return value;
}

function expectNullableInt(value: unknown, label: string): number | null {
  if (value === null) {
    return null;
  }
  return expectInt(value, label);
}

function expectBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`invalid ${label}`);
  }

  return value;
}

function parseAiTaskStatus(value: unknown): AiTaskStatus {
  const status = expectString(value, "ai task status");
  if (status !== "queued" && status !== "running" && status !== "completed" && status !== "failed") {
    throw new Error(`invalid ai task status: ${status}`);
  }

  return status;
}

function parseAiTaskRecord(value: unknown): AiTaskRecord {
  const record = expectRecord(value, "ai task");
  const schemaVersion = expectInt(record.schemaVersion, "ai task schemaVersion");
  if (schemaVersion !== 1) {
    throw new Error(`invalid ai task schemaVersion: ${String(schemaVersion)}`);
  }
  const kind = expectString(record.kind, "ai task kind");
  if (kind !== "managed-project-edit") {
    throw new Error(`invalid ai task kind: ${kind}`);
  }

  return {
    schemaVersion,
    taskId: expectString(record.taskId, "ai task taskId"),
    kind,
    status: parseAiTaskStatus(record.status),
    projectSlug: expectString(record.projectSlug, "ai task projectSlug"),
    taskSlug: expectString(record.taskSlug, "ai task taskSlug"),
    prompt: expectString(record.prompt, "ai task prompt"),
    parentTaskId: expectNullableString(record.parentTaskId, "ai task parentTaskId"),
    sessionId: expectNullableString(record.sessionId, "ai task sessionId"),
    createdAt: expectString(record.createdAt, "ai task createdAt"),
    completedAt: expectNullableString(record.completedAt, "ai task completedAt"),
    managedTaskPath: expectString(record.managedTaskPath, "ai task managedTaskPath"),
    workspaceProjectPath: expectString(record.workspaceProjectPath, "ai task workspaceProjectPath"),
    stdoutPath: expectNullableString(record.stdoutPath, "ai task stdoutPath"),
    stderrPath: expectNullableString(record.stderrPath, "ai task stderrPath"),
    summaryPath: expectNullableString(record.summaryPath, "ai task summaryPath"),
    validationPath: expectNullableString(record.validationPath, "ai task validationPath"),
    codexExitCode: expectNullableInt(record.codexExitCode, "ai task codexExitCode"),
    error: expectNullableString(record.error, "ai task error"),
    appliedAt: expectNullableString(record.appliedAt, "ai task appliedAt")
  };
}

function parseManagedTaskSummary(value: unknown): ManagedTaskSummary {
  const summary = expectRecord(value, "managed task summary");
  const rawChanges = summary.changes;
  if (!Array.isArray(rawChanges)) {
    throw new Error("invalid managed task summary changes");
  }

  return {
    projectSlug: expectString(summary.projectSlug, "managed task summary projectSlug"),
    taskSlug: expectString(summary.taskSlug, "managed task summary taskSlug"),
    generatedAt: expectString(summary.generatedAt, "managed task summary generatedAt"),
    changedFiles: expectInt(summary.changedFiles, "managed task summary changedFiles"),
    changes: rawChanges.map((change, index) => {
      const changeIndex = String(index);
      const record = expectRecord(change, `managed task summary change ${changeIndex}`);
      const kind = expectString(record.kind, `managed task summary change ${changeIndex} kind`);
      if (kind !== "added" && kind !== "deleted" && kind !== "modified") {
        throw new Error(`invalid managed task summary change ${changeIndex} kind: ${kind}`);
      }

      return {
        path: expectString(record.path, `managed task summary change ${changeIndex} path`),
        kind
      };
    })
  };
}

function parseCreateAiTaskInput(value: CreateAiTaskInput): CreateAiTaskInput {
  const input = expectRecord(value, "create ai task input");
  const parsed: CreateAiTaskInput = {
    projectSlug: expectString(input.projectSlug, "create ai task input projectSlug"),
    taskSlug: expectString(input.taskSlug, "create ai task input taskSlug"),
    prompt: expectString(input.prompt, "create ai task input prompt")
  };

  if (input.force !== undefined) {
    parsed.force = expectBoolean(input.force, "create ai task input force");
  }
  if (input.parentTaskId !== undefined) {
    const parentTaskId = expectString(input.parentTaskId, "create ai task input parentTaskId").trim();
    if (parentTaskId.length > 0) {
      parsed.parentTaskId = parentTaskId;
    }
  }
  return parsed;
}

function parseAiTaskDiagnostics(value: unknown): AiTaskDiagnostics {
  const diagnostics = expectRecord(value, "ai task diagnostics");
  return {
    taskId: expectString(diagnostics.taskId, "ai task diagnostics taskId"),
    parentTaskId: expectNullableString(diagnostics.parentTaskId, "ai task diagnostics parentTaskId"),
    sessionId: expectNullableString(diagnostics.sessionId, "ai task diagnostics sessionId"),
    status: parseAiTaskStatus(diagnostics.status),
    codexExitCode: expectNullableInt(diagnostics.codexExitCode, "ai task diagnostics codexExitCode"),
    error: expectNullableString(diagnostics.error, "ai task diagnostics error"),
    stdout: typeof diagnostics.stdout === "string" ? diagnostics.stdout : "",
    stderr: typeof diagnostics.stderr === "string" ? diagnostics.stderr : ""
  };
}

function parseAiTaskApplyResult(value: unknown): AiTaskApplyResult {
  const result = expectRecord(value, "ai task apply result");
  const status = expectString(result.status, "ai task apply result status");
  if (status !== "applied") {
    throw new Error(`invalid ai task apply result status: ${status}`);
  }

  return {
    projectSlug: expectString(result.projectSlug, "ai task apply result projectSlug"),
    taskSlug: expectString(result.taskSlug, "ai task apply result taskSlug"),
    changedFiles: expectInt(result.changedFiles, "ai task apply result changedFiles"),
    status,
    lastAppliedAt: expectString(result.lastAppliedAt, "ai task apply result lastAppliedAt")
  };
}

function readGatewayErrorCode(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const errorCode = (value as Record<string, unknown>).error;
  return errorCode === undefined || typeof errorCode !== "string" ? null : errorCode;
}

export class AiTaskApiClient implements AiTaskClient {
  private readonly adminToken: string | null;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  public constructor(options: AiTaskApiClientOptions = {}) {
    this.adminToken = options.adminToken ?? null;
    this.baseUrl = options.baseUrl ?? "";
    this.fetchImpl = resolveFetch(options.fetch);
  }

  public async listTasks(): Promise<AiTaskRecord[]> {
    const payload = expectRecord(await this.requestJson("/api/ai/tasks", {}), "ai task list payload");
    const rawTasks = payload.tasks;
    if (!Array.isArray(rawTasks)) {
      throw new Error("invalid ai task list payload");
    }

    return rawTasks.map((task, index) => {
      return parseAiTaskRecord(expectRecord(task, `ai task list payload task ${String(index)}`));
    });
  }

  public async readTask(taskId: string): Promise<AiTaskRecord> {
    const payload = expectRecord(await this.requestJson(`/api/ai/tasks/${taskId}`, {}), "ai task payload");
    return parseAiTaskRecord(payload.task);
  }

  public async readSummary(taskId: string): Promise<ManagedTaskSummary> {
    const payload = expectRecord(
      await this.requestJson(`/api/ai/tasks/${taskId}/summary`, {}),
      "ai task summary payload"
    );
    return parseManagedTaskSummary(payload.summary);
  }

  public async readDiagnostics(taskId: string): Promise<AiTaskDiagnostics> {
    const payload = expectRecord(
      await this.requestJson(`/api/ai/tasks/${taskId}/diagnostics`, {}),
      "ai task diagnostics payload"
    );
    return parseAiTaskDiagnostics(payload.diagnostics);
  }

  public async createTask(input: CreateAiTaskInput): Promise<AiTaskRecord> {
    const payload = expectRecord(
      await this.requestJson("/api/ai/tasks", {
        method: "POST",
        headers: this.buildAuthHeaders(),
        body: JSON.stringify(parseCreateAiTaskInput(input))
      }),
      "create ai task payload"
    );
    return parseAiTaskRecord(payload.task);
  }

  public async applyTask(taskId: string): Promise<{ task: AiTaskRecord; result: AiTaskApplyResult }> {
    const payload = expectRecord(
      await this.requestJson(`/api/ai/tasks/${taskId}/apply`, {
        method: "POST",
        headers: this.buildAuthHeaders()
      }),
      "apply ai task payload"
    );
    return {
      task: parseAiTaskRecord(payload.task),
      result: parseAiTaskApplyResult(payload.result)
    };
  }

  public async waitForTask(
    taskId: string,
    options: WaitForAiTaskOptions = {}
  ): Promise<AiTaskRecord> {
    const maxAttempts = options.maxAttempts ?? 120;
    const pollIntervalMs = options.pollIntervalMs ?? 1_000;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const task = await this.readTask(taskId);
      if (task.status === "completed" || task.status === "failed") {
        return task;
      }
      await sleep(pollIntervalMs);
    }

    throw new Error(`ai task did not settle: ${taskId}`);
  }

  private buildAuthHeaders(): HeadersInit {
    const headers = new Headers({
      "content-type": "application/json"
    });
    if (this.adminToken !== null) {
      headers.set("authorization", `Bearer ${this.adminToken}`);
    }
    return headers;
  }

  private async requestJson(pathname: string, init: RequestInit): Promise<unknown> {
    const response = await this.fetchImpl(`${this.baseUrl}${pathname}`, init);
    const body: unknown = await response.json();
    if (!response.ok) {
      throw new GatewayApiError(response.status, readGatewayErrorCode(body));
    }

    return body;
  }
}
