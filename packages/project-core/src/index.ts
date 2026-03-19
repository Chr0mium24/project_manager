export {
  createProject,
  getContentRepoRoot,
  getProjectEntryPath,
  getProjectJsonPath,
  getProjectRoot,
  getProjectsIndexPath,
  listProjects,
  readProject,
  readProjectEntry,
  readProjectsIndex,
  type CreateProjectOptions
} from "./content-repo.ts";
export {
  listProjectFiles,
  readProjectFile,
  writeProjectFile,
  type ProjectFileRecord
} from "./project-files.ts";
export type { ProjectFileWriteResult } from "./project-files.ts";
export {
  buildProjectFileTree,
  readProjectFileTree,
  type ProjectFileTreeDirectoryNode,
  type ProjectFileTreeFileNode,
  type ProjectFileTreeNode
} from "./project-file-tree.ts";
export { validateContentRepo, type ContentRepoValidationSummary } from "./content-repo-validation.ts";
export {
  listManagedTasks,
  readManagedTask,
  readManagedTaskSummary,
  readManagedTaskValidation
} from "./managed-task-query.ts";
export {
  getManagedTaskPaths,
  getManagedTasksRoot,
  summarizeManagedTask,
  startManagedTask,
  type ManagedTaskChange,
  type ManagedTaskManifest,
  type ManagedTaskPaths,
  type ManagedTaskSummary,
  type StartManagedTaskOptions,
  type StartManagedTaskResult
} from "./managed-task.ts";
export {
  validateManagedTask,
  type ManagedTaskValidation
} from "./managed-task-validation.ts";
export {
  applyManagedTask,
  type ManagedTaskApplyResult
} from "./managed-task-apply.ts";
export type {
  ManagedProject,
  ProjectIndexEntry,
  ProjectsIndex
} from "./schemas.ts";

export const moduleName = "@project-manager/project-core";
