export const moduleName = '@project-manager/web';

export function describeModule(): string {
  return 'web module placeholder';
}

export {
  createProjectManagerApp,
  type ProjectManagerApp
} from "./app/create-project-manager-app.ts";
export {
  createProjectManagerRouter,
  projectManagerRoutes,
  projectRouteTabs,
  type ProjectRouteTab
} from "./app/project-manager-router.ts";
export {
  createProjectManagerPinia,
  useProjectContextStore
} from "./app/project-context-store.ts";

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
  GatewayProjectApiClient
} from "./gateway-api.ts";
export type {
  ManagedProjectRecord,
  ProjectFileTreeDirectoryNode,
  ProjectFileTreeFileNode,
  ProjectFileTreeNode,
  ProjectListEntry,
  ProjectVersionDiff,
  ProjectVersionRecord
} from "./gateway-api.ts";
export {
  readPlatformAsset,
  renderPlatformDocument,
  type PlatformAsset,
  type PlatformDocumentInput
} from "./platform-ui.ts";
