export const moduleName = '@project-manager/web';

export function describeModule(): string {
  return 'web module placeholder';
}

export { AiTaskApiClient, GatewayApiError } from "./ai-task-api.ts";
export type {
  AiTaskApplyResult,
  AiTaskClient,
  AiTaskRecord,
  CreateAiTaskInput,
  ManagedTaskSummary,
  WaitForAiTaskOptions
} from "./ai-task-api.ts";
export {
  AiTaskPanelController,
  type AiTaskPanelState
} from "./ai-task-panel.ts";
export {
  readPlatformAsset,
  renderPlatformDocument,
  type PlatformAsset,
  type PlatformDocumentInput
} from "./platform-ui.ts";
