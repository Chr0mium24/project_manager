import type { App } from "vue";
import { createApp } from "vue";
import { createProjectManagerPinia, useProjectContextStore } from "./project-context-store.ts";
import { ProjectManagerShell } from "./project-manager-shell.ts";
import { createProjectManagerMemoryRouter, createProjectManagerRouter } from "./project-manager-router.ts";

export interface CreateProjectManagerAppOptions {
  useMemoryHistory?: boolean;
}

export interface ProjectManagerApp {
  app: App<Element>;
  pinia: ReturnType<typeof createProjectManagerPinia>;
  router: ReturnType<typeof createProjectManagerRouter>;
}

export function createProjectManagerApp(
  options: CreateProjectManagerAppOptions = {}
): ProjectManagerApp {
  const pinia = createProjectManagerPinia();
  useProjectContextStore(pinia).initializeAdminToken();
  const router = options.useMemoryHistory
    ? createProjectManagerMemoryRouter(pinia)
    : createProjectManagerRouter(pinia);
  const app = createApp(ProjectManagerShell);
  app.use(pinia);
  app.use(router);
  return {
    app,
    pinia,
    router
  };
}
