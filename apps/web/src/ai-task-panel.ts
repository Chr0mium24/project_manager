import {
  type AiTaskClient,
  type AiTaskRecord,
  type CreateAiTaskInput,
  type ManagedTaskSummary
} from "./ai-task-api.ts";

export interface AiTaskPanelState {
  tasks: AiTaskRecord[];
  selectedTask: AiTaskRecord | null;
  summary: ManagedTaskSummary | null;
  error: string | null;
  isBusy: boolean;
}

function getTaskError(task: AiTaskRecord): string | null {
  if (task.status !== "failed") {
    return null;
  }

  return task.error ?? `ai task failed: ${task.taskId}`;
}

export class AiTaskPanelController {
  public readonly state: AiTaskPanelState = {
    tasks: [],
    selectedTask: null,
    summary: null,
    error: null,
    isBusy: false
  };

  public constructor(private readonly client: AiTaskClient) {}

  public async refreshTasks(): Promise<void> {
    this.state.tasks = await this.client.listTasks();
  }

  public async selectTask(taskId: string): Promise<void> {
    const task = await this.client.readTask(taskId);
    const summary = task.summaryPath === null ? null : await this.client.readSummary(taskId);
    this.assignSelection(task, summary);
  }

  public async createTask(input: CreateAiTaskInput): Promise<void> {
    this.state.isBusy = true;
    this.state.error = null;

    try {
      const createdTask = await this.client.createTask(input);
      const settledTask = await this.client.waitForTask(createdTask.taskId, {
        pollIntervalMs: 250
      });
      const summary = settledTask.summaryPath === null ? null : await this.client.readSummary(settledTask.taskId);
      await this.refreshTasks();
      this.assignSelection(settledTask, summary);
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : "unknown ai task error";
      throw error;
    } finally {
      this.state.isBusy = false;
    }
  }

  public async applySelectedTask(): Promise<void> {
    const selectedTask = this.state.selectedTask;
    if (selectedTask === null) {
      throw new Error("no ai task selected");
    }

    this.state.isBusy = true;
    this.state.error = null;

    try {
      const applied = await this.client.applyTask(selectedTask.taskId);
      await this.refreshTasks();
      this.assignSelection(applied.task, this.state.summary);
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : "unknown ai task error";
      throw error;
    } finally {
      this.state.isBusy = false;
    }
  }

  private assignSelection(task: AiTaskRecord, summary: ManagedTaskSummary | null): void {
    this.state.selectedTask = task;
    this.state.summary = summary;
    this.state.error = getTaskError(task);
  }
}
