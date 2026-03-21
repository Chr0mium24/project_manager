export interface AiEventStreamEntry {
  title: string;
  body: string[];
  details: string[];
  autoCollapsed: boolean;
  tone: "neutral" | "success" | "error";
}

interface EventRecord {
  type: string;
  [key: string]: unknown;
}

interface ErrorRecord {
  message?: unknown;
}

interface ItemRecord {
  id?: unknown;
  type?: unknown;
  text?: unknown;
  command?: unknown;
  aggregated_output?: unknown;
  exit_code?: unknown;
  changes?: unknown;
  status?: unknown;
}

interface FileChangeRecord {
  path?: unknown;
  kind?: unknown;
}

function parseJsonLine(line: string): EventRecord | null {
  try {
    const value: unknown = JSON.parse(line);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }

    const record = value as EventRecord;
    return typeof record.type === "string" ? record : null;
  } catch {
    return null;
  }
}

function toTextList(value: unknown): string[] {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  return value
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function formatFileChange(change: unknown): string | null {
  if (typeof change !== "object" || change === null || Array.isArray(change)) {
    return null;
  }

  const record = change as FileChangeRecord;
  return typeof record.path === "string" && typeof record.kind === "string"
    ? `${record.kind} ${record.path}`
    : null;
}

function renderCompletedItem(item: ItemRecord): AiEventStreamEntry | null {
  if (item.type === "agent_message" && typeof item.text === "string") {
    return {
      title: "AI",
      body: toTextList(item.text),
      details: [],
      autoCollapsed: false,
      tone: "success"
    };
  }

  if (item.type === "command_execution" && typeof item.command === "string") {
    const outputLines = toTextList(item.aggregated_output);
    const body = [
      item.command,
      typeof item.exit_code === "number" ? `exit ${String(item.exit_code)}` : null
    ].filter((line): line is string => line !== null);
    return {
      title: "Command finished",
      body,
      details: outputLines,
      autoCollapsed: outputLines.length > 0,
      tone: "neutral"
    };
  }

  if (item.type === "file_change" && Array.isArray(item.changes)) {
    const body = item.changes
      .map(formatFileChange)
      .filter((line): line is string => line !== null);
    return {
      title: "Files changed",
      body: body.length === 0 ? ["No file change details reported."] : body,
      details: [],
      autoCollapsed: false,
      tone: "neutral"
    };
  }

  return null;
}

function renderStartedItem(item: ItemRecord): AiEventStreamEntry | null {
  if (item.type === "command_execution" && typeof item.command === "string") {
    return {
      title: "Command started",
      body: [item.command],
      details: [],
      autoCollapsed: false,
      tone: "neutral"
    };
  }

  return null;
}

function renderLifecycleEvent(record: EventRecord): AiEventStreamEntry | null {
  if (record.type === "thread.started" && typeof record.thread_id === "string") {
    return {
      title: "Thread started",
      body: [record.thread_id],
      details: [],
      autoCollapsed: false,
      tone: "neutral"
    };
  }

  if (record.type === "turn.started") {
    return {
      title: "Turn started",
      body: [],
      details: [],
      autoCollapsed: false,
      tone: "neutral"
    };
  }

  if (record.type === "turn.completed") {
    return {
      title: "Turn ended",
      body: [],
      details: [],
      autoCollapsed: false,
      tone: "success"
    };
  }

  return renderErrorEvent(record);
}

function renderErrorEvent(record: EventRecord): AiEventStreamEntry | null {
  if (record.type === "error" && typeof record.message === "string") {
    return {
      title: "Stream issue",
      body: [record.message],
      details: [],
      autoCollapsed: false,
      tone: "error"
    };
  }

  if (record.type !== "turn.failed" || typeof record.error !== "object" || record.error === null
    || Array.isArray(record.error)) {
    return null;
  }

  const error = record.error as ErrorRecord;
  if (typeof error.message !== "string") {
    return null;
  }

  return {
    title: "Turn ended",
    body: [error.message],
    details: [],
    autoCollapsed: false,
    tone: "error"
  };
}

function renderItemEvent(record: EventRecord): AiEventStreamEntry | null {
  if ((record.type !== "item.started" && record.type !== "item.completed") || typeof record.item !== "object"
    || record.item === null || Array.isArray(record.item)) {
    return null;
  }

  const item = record.item as ItemRecord;
  return record.type === "item.started" ? renderStartedItem(item) : renderCompletedItem(item);
}

function renderEvent(record: EventRecord): AiEventStreamEntry | null {
  return renderLifecycleEvent(record) ?? renderItemEvent(record);
}

export function parseAiEventStream(stdout: string): AiEventStreamEntry[] | null {
  const lines = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return null;
  }

  const entries: AiEventStreamEntry[] = [];
  for (const line of lines) {
    const record = parseJsonLine(line);
    if (record === null) {
      return null;
    }

    const entry = renderEvent(record);
    if (entry !== null) {
      entries.push(entry);
    }
  }

  return entries.length === 0 ? null : entries;
}
