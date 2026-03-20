import { createPinia, defineStore } from "pinia";
import {
  GatewayProjectApiClient,
  type ProjectListEntry
} from "../gateway-api.ts";

export const useProjectContextStore = defineStore("projectContext", {
  state: () => ({
    projectSlug: "",
    adminToken: "",
    projects: [] as ProjectListEntry[],
    projectsLoading: false,
    projectsError: null as string | null
  }),
  actions: {
    setProjectSlug(projectSlug: string): void {
      this.projectSlug = projectSlug;
    },
    setAdminToken(adminToken: string): void {
      this.adminToken = adminToken;
    },
    async loadProjects(client: GatewayProjectApiClient = new GatewayProjectApiClient()): Promise<void> {
      this.projectsLoading = true;
      this.projectsError = null;
      try {
        this.projects = await client.listProjects();
      } catch (error) {
        this.projectsError = error instanceof Error ? error.message : "unknown project list error";
      } finally {
        this.projectsLoading = false;
      }
    }
  }
});

export function createProjectManagerPinia() {
  return createPinia();
}
