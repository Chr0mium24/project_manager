import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createProjectManagerApp } from "../src/app/create-project-manager-app.ts";
import { ProjectManagerShell } from "../src/app/project-manager-shell.ts";
import { useProjectContextStore } from "../src/app/project-context-store.ts";

async function createMountedShell(initialPath: string) {
  const created = createProjectManagerApp({
    useMemoryHistory: true
  });
  await created.router.push(initialPath);
  await created.router.isReady();
  const wrapper = mount(ProjectManagerShell, {
    global: {
      plugins: [created.pinia, created.router]
    }
  });
  return {
    created,
    wrapper
  };
}

describe("project manager app", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("redirects the root route to the projects index", async () => {
    const { created, wrapper } = await createMountedShell("/");
    await wrapper.vm.$nextTick();
    expect(created.router.currentRoute.value.path).toBe("/projects");
    expect(wrapper.get("[data-view='projects-index']").text()).toContain("Route-based control plane");
  });

  it("syncs the selected project slug into Pinia from the router", async () => {
    const { created, wrapper } = await createMountedShell("/projects/landing-a/workspace");
    await wrapper.vm.$nextTick();
    const context = useProjectContextStore(created.pinia);
    expect(context.projectSlug).toBe("landing-a");
    expect(wrapper.get("[data-view='workspace']").text()).toContain("Project Workspace");
  });

  it("renders project route tabs for project pages", async () => {
    const { wrapper } = await createMountedShell("/projects/service-b/ai");
    await wrapper.vm.$nextTick();
    const tabLinks = wrapper.findAll(".pm-tab-link");
    expect(tabLinks).toHaveLength(4);
    expect(tabLinks[3]?.text()).toBe("AI Tasks");
    expect(wrapper.get("[data-view='ai']").text()).toContain("Project AI Tasks");
  });
});
