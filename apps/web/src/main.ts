import { createProjectManagerApp } from "./app/create-project-manager-app.ts";
import { PROJECT_MANAGER_SHELL_STYLES } from "./app/project-manager-shell.ts";

function ensureStyles() {
  if (document.querySelector("[data-project-manager-styles]")) {
    return;
  }
  const style = document.createElement("style");
  style.setAttribute("data-project-manager-styles", "true");
  style.textContent = PROJECT_MANAGER_SHELL_STYLES;
  document.head.append(style);
}

async function bootstrap() {
  const mountTarget = document.querySelector("[data-project-manager-app]");
  if (!(mountTarget instanceof HTMLElement)) {
    return;
  }
  ensureStyles();
  const { app, router } = createProjectManagerApp();
  await router.push(window.location.pathname || "/projects");
  await router.isReady();
  app.mount(mountTarget);
}

void bootstrap();
