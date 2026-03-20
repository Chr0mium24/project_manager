export const PROJECT_MANAGER_UI_SOURCE_HEADER = "x-project-manager-ui-source";
export const VITE_DEV_UI_SOURCE = "vite-dev";

export function isPlatformDocumentPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/projects" || pathname.startsWith("/projects/");
}
