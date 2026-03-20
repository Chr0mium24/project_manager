export interface ProjectRouteTab {
  href: string;
  key: string;
  label: string;
}

export function createProjectRouteTabs(projectSlug: string): ProjectRouteTab[] {
  return [
    {
      key: "overview",
      label: "Overview",
      href: `/projects/${projectSlug}`
    },
    {
      key: "workspace",
      label: "Workspace",
      href: `/projects/${projectSlug}/workspace`
    },
    {
      key: "versions",
      label: "Versions",
      href: `/projects/${projectSlug}/versions`
    },
    {
      key: "ai",
      label: "AI Tasks",
      href: `/projects/${projectSlug}/ai`
    }
  ];
}
