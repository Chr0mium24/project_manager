import type { Pinia } from "pinia";
import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
  type Router,
  type RouterHistory
} from "vue-router";
import { useProjectContextStore } from "./project-context-store.ts";
import { createProjectRouteTabs, type ProjectRouteTab } from "./project-route-tabs.ts";
import {
  ProjectAiTasksView,
  ProjectOverviewView,
  ProjectsIndexView,
  ProjectVersionsView,
  ProjectWorkspaceView
} from "./project-manager-views.ts";

export const projectManagerRoutes: RouteRecordRaw[] = [
  {
    path: "/projects",
    name: "projects-index",
    component: ProjectsIndexView
  },
  {
    path: "/projects/:slug",
    name: "project-overview",
    component: ProjectOverviewView
  },
  {
    path: "/projects/:slug/workspace",
    name: "project-workspace",
    component: ProjectWorkspaceView
  },
  {
    path: "/projects/:slug/versions",
    name: "project-versions",
    component: ProjectVersionsView
  },
  {
    path: "/projects/:slug/ai",
    name: "project-ai",
    component: ProjectAiTasksView
  }
];

export type { ProjectRouteTab };

function syncProjectContext(router: Router, pinia: Pinia) {
  const store = useProjectContextStore(pinia);
  router.afterEach((to) => {
    const slug = typeof to.params.slug === "string" ? to.params.slug : "";
    store.setProjectSlug(slug);
  });
}

export function createProjectManagerRouter(pinia: Pinia, history?: RouterHistory): Router {
  const router = createRouter({
    history: history ?? createWebHistory(),
    routes: projectManagerRoutes
  });
  syncProjectContext(router, pinia);
  return router;
}

export function createProjectManagerMemoryRouter(pinia: Pinia): Router {
  return createProjectManagerRouter(pinia, createMemoryHistory());
}

export function projectRouteTabs(projectSlug: string): ProjectRouteTab[] {
  return createProjectRouteTabs(projectSlug);
}
