import { describe, expect, it } from "vitest";
import { projectManagerRoutes, projectRouteTabs } from "../src/app/project-manager-router.ts";

describe("project manager route smoke", () => {
  it("defines the required dedicated project routes", () => {
    const paths = projectManagerRoutes.map((route) => route.path);
    expect(paths).toEqual([
      "/projects",
      "/projects/:slug",
      "/projects/:slug/workspace",
      "/projects/:slug/versions",
      "/projects/:slug/ai"
    ]);
  });

  it("builds the expected project navigation tabs", () => {
    expect(projectRouteTabs("landing-a")).toEqual([
      { key: "overview", label: "Overview", href: "/projects/landing-a" },
      { key: "workspace", label: "Workspace", href: "/projects/landing-a/workspace" },
      { key: "versions", label: "Versions", href: "/projects/landing-a/versions" },
      { key: "ai", label: "AI Tasks", href: "/projects/landing-a/ai" }
    ]);
  });
});
