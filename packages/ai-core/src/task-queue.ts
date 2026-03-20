import process from "node:process";
import { type CodexExecutor } from "./codex-executor.ts";
import {
  createAiTask,
  runAiTask,
  type AiTaskRecord,
  type AiTaskRunnerOptions,
  type CreateAiTaskOptions
} from "./task-runner.ts";

export class AiTaskQueue {
  private readonly taskIds: string[] = [];
  private drainPromise: Promise<void> | null = null;
  private readonly idleWaiters: Array<() => void> = [];

  public constructor(
    private readonly rootDir: string,
    private readonly runnerOptions?: AiTaskRunnerOptions
  ) {}

  public enqueue(options: CreateAiTaskOptions): AiTaskRecord {
    const task = createAiTask(this.rootDir, options);
    this.taskIds.push(task.taskId);
    this.scheduleDrain();
    return task;
  }

  public waitForIdle(): Promise<void> {
    if (this.drainPromise === null && this.taskIds.length === 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.idleWaiters.push(resolve);
    });
  }

  private scheduleDrain(): void {
    if (this.drainPromise !== null) {
      return;
    }

    this.drainPromise = this.drain()
      .catch((error: unknown) => {
        process.stderr.write(`ai task queue drain failed: ${String(error)}\n`);
      })
      .finally(() => {
        this.drainPromise = null;
        if (this.taskIds.length > 0) {
          this.scheduleDrain();
          return;
        }
        this.resolveIdleWaiters();
      });
  }

  private async drain(): Promise<void> {
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    while (this.taskIds.length > 0) {
      const taskId = this.taskIds.shift();
      if (taskId === undefined) {
        break;
      }
      await runAiTask(this.rootDir, taskId, this.runnerOptions);
    }
  }

  private resolveIdleWaiters(): void {
    while (this.idleWaiters.length > 0) {
      const resolve = this.idleWaiters.shift();
      resolve?.();
    }
  }
}

export function createAiTaskQueue(
  rootDir: string,
  runnerOptions?: { executor?: CodexExecutor }
): AiTaskQueue {
  return new AiTaskQueue(rootDir, runnerOptions);
}
