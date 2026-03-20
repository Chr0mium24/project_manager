import { createPinia, defineStore } from "pinia";

export const useProjectContextStore = defineStore("projectContext", {
  state: () => ({
    projectSlug: ""
  }),
  actions: {
    setProjectSlug(projectSlug: string): void {
      this.projectSlug = projectSlug;
    }
  }
});

export function createProjectManagerPinia() {
  return createPinia();
}
