import type { ProjectListEntry } from "../gateway-api.ts";

export function runtimeHrefForProject(project: Pick<ProjectListEntry, "runtime" | "slug">): string {
  return project.runtime === "static" ? `/p/${project.slug}` : `/app/${project.slug}`;
}

export function runtimeHrefForSlug(
  projects: readonly Pick<ProjectListEntry, "runtime" | "slug">[],
  projectSlug: string
): string | null {
  const matchedProject = projects.find((project) => project.slug === projectSlug);
  return matchedProject ? runtimeHrefForProject(matchedProject) : null;
}
