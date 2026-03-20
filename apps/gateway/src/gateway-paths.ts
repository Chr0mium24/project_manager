export function isPlatformUiPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/projects"
    || pathname.startsWith("/projects/") || pathname.startsWith("/assets/");
}

export function isControlApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/projects")
    || pathname.startsWith("/api/admin")
    || pathname.startsWith("/api/ai")
    || pathname.startsWith("/api/publish");
}
