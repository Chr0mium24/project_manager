import type { Ref } from "vue";
import type { AiTaskDiagnostics, AiTaskRecord, AiTaskSandboxMode, ManagedTaskSummary } from "../ai-task-api.ts";

interface AiComposerControlsContext {
  composeOpen: Ref<boolean>;
  diagnostics: Ref<AiTaskDiagnostics | null>;
  error: Ref<string | null>;
  isBusy: Ref<boolean>;
  parentTaskId: Ref<string | null>;
  prompt: Ref<string>;
  sandboxMode: Ref<AiTaskSandboxMode>;
  selectedTask: Ref<AiTaskRecord | null>;
  summary: Ref<ManagedTaskSummary | null>;
  taskSlug: Ref<string>;
  tasks: Ref<AiTaskRecord[]>;
}

export function createAiComposerControls(context: AiComposerControlsContext) {
  function openNewTaskComposer() {
    const shouldSwitchFromFollowUp = context.parentTaskId.value !== null;
    context.parentTaskId.value = null;
    context.sandboxMode.value = "workspace-write";
    context.composeOpen.value = shouldSwitchFromFollowUp ? true : !context.composeOpen.value;
  }

  function openFollowUpComposer() {
    if (context.selectedTask.value === null) {
      return;
    }
    context.parentTaskId.value = context.selectedTask.value.taskId;
    context.sandboxMode.value = context.selectedTask.value.sandboxMode;
    context.composeOpen.value = true;
  }

  function reset() {
    context.tasks.value = [];
    context.selectedTask.value = null;
    context.summary.value = null;
    context.diagnostics.value = null;
    context.error.value = null;
    context.isBusy.value = false;
    context.composeOpen.value = false;
    context.taskSlug.value = "";
    context.prompt.value = "";
    context.sandboxMode.value = "workspace-write";
    context.parentTaskId.value = null;
  }

  return { openFollowUpComposer, openNewTaskComposer, reset };
}
