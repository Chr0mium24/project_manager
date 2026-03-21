import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createProjectManagerApp } from "../src/app/create-project-manager-app.ts";
import { ProjectManagerShell } from "../src/app/project-manager-shell.ts";
import { useProjectContextStore } from "../src/app/project-context-store.ts";

async function createMountedShell(initialPath: string, adminToken = "") {
  const created = createProjectManagerApp({
    useMemoryHistory: true
  });
  if (adminToken.length > 0) {
    useProjectContextStore(created.pinia).setAdminToken(adminToken);
  }
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
    window.localStorage.clear();
  });

  it("redirects the root route to the projects index", async () => {
    const { created, wrapper } = await createMountedShell("/");
    await wrapper.vm.$nextTick();
    expect(created.router.currentRoute.value.path).toBe("/projects");
    expect(wrapper.get("[data-view='projects-index']").text()).toContain("Project directory");
  });

  it("syncs the selected project slug into Pinia from the router when admin mode is active", async () => {
    const { created, wrapper } = await createMountedShell("/projects/landing-a/workspace", "test-admin-token");
    await wrapper.vm.$nextTick();
    const context = useProjectContextStore(created.pinia);
    expect(context.projectSlug).toBe("landing-a");
    expect(wrapper.get("[data-view='workspace']").text()).toContain("Repository workspace");
  });

  it("renders project route tabs for project pages", async () => {
    const { wrapper } = await createMountedShell("/projects/service-b/ai", "test-admin-token");
    await wrapper.vm.$nextTick();
    const tabLinks = wrapper.findAll(".pm-tab-link");
    expect(tabLinks).toHaveLength(4);
    expect(tabLinks[3]?.text()).toBe("AI Tasks");
    expect(wrapper.get("[data-view='ai']").text()).toContain("Repository AI sessions");
  });

  it("keeps management routes behind admin access", async () => {
    const { created, wrapper } = await createMountedShell("/projects/landing-a");
    await wrapper.vm.$nextTick();
    expect(created.router.currentRoute.value.path).toBe("/projects");
    expect(wrapper.get("[data-view='projects-index']").text()).toContain("Project directory");
  });

  it("shows admin access entry in the global shell on the projects index", async () => {
    const { wrapper } = await createMountedShell("/projects");
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("Admin access");
  });

  it("renders admin access as a modal", async () => {
    const { wrapper } = await createMountedShell("/projects");
    await wrapper.get("button.pm-project-link").trigger("click");
    expect(wrapper.html()).toContain("pm-modal-backdrop");
    expect(wrapper.text()).toContain("Admin access");
  });

  it("uses overview as a workflow hand-off route", async () => {
    const { wrapper } = await createMountedShell("/projects/landing-a", "test-admin-token");
    await wrapper.vm.$nextTick();
    expect(wrapper.get("[data-view='overview']").text()).toContain(
      "Start from repository identity and public route status, then move into the workflow tab you need."
    );
  });
});
