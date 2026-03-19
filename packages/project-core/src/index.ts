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
export { validateContentRepo, type ContentRepoValidationSummary } from "./content-repo-validation.ts";
export {
  getManagedTaskPaths,
  getManagedTasksRoot,
  startManagedTask,
  type ManagedTaskManifest,
  type ManagedTaskPaths,
  type StartManagedTaskOptions,
  type StartManagedTaskResult
} from "./managed-task.ts";
export type {
  ManagedProject,
  ProjectIndexEntry,
  ProjectsIndex
} from "./schemas.ts";

export const moduleName = "@project-manager/project-core";
