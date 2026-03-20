import { createPinia, defineStore } from "pinia";
import {
  GatewayProjectApiClient,
  type ProjectListEntry
} from "../gateway-api.ts";

const ADMIN_TOKEN_STORAGE_KEY = "project-manager-admin-token";

function readStoredAdminToken(): string {
  if (typeof globalThis.localStorage === "undefined") {
    return "";
  }

  return globalThis.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)?.trim() ?? "";
}

function persistAdminToken(adminToken: string): void {
  if (typeof globalThis.localStorage === "undefined") {
    return;
  }

  if (adminToken.length === 0) {
    globalThis.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    return;
  }

  globalThis.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, adminToken);
}

export const useProjectContextStore = defineStore("projectContext", {
  state: () => ({
    projectSlug: "",
    adminToken: "",
    projects: [] as ProjectListEntry[],
    projectsLoading: false,
    projectsError: null as string | null
  }),
  actions: {
    initializeAdminToken(): void {
      this.adminToken = readStoredAdminToken();
    },
    setProjectSlug(projectSlug: string): void {
      this.projectSlug = projectSlug;
    },
    setAdminToken(adminToken: string): void {
      this.adminToken = adminToken;
      persistAdminToken(adminToken);
    },
    clearAdminToken(): void {
      this.adminToken = "";
      persistAdminToken("");
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
