import { createProjectManagerApp } from "./app/create-project-manager-app.ts";
import { PROJECT_MANAGER_SHELL_STYLES } from "./app/project-manager-shell.ts";

const PROJECT_MANAGER_UI_SOURCE = import.meta.env.DEV ? "vite-dev" : "vite-build";

function setDebugState() {
  document.documentElement.dataset.projectManagerUiSource = PROJECT_MANAGER_UI_SOURCE;
  (
    globalThis as typeof globalThis & {
      __PROJECT_MANAGER_DEBUG__?: {
        uiSource: string;
        path: string;
        href: string;
      };
    }
  ).__PROJECT_MANAGER_DEBUG__ = {
    uiSource: PROJECT_MANAGER_UI_SOURCE,
    path: window.location.pathname,
    href: window.location.href
  };
}

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

  setDebugState();
  ensureStyles();
  const { app, router } = createProjectManagerApp();
  await router.push(window.location.pathname || "/projects");
  await router.isReady();
  app.mount(mountTarget);
  console.info("[project-manager] bootstrap complete", {
    uiSource: PROJECT_MANAGER_UI_SOURCE,
    path: window.location.pathname
  });
}

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[project-manager] bootstrap failed", {
    uiSource: PROJECT_MANAGER_UI_SOURCE,
    path: window.location.pathname,
    error
  });

  const mountTarget = document.querySelector("[data-project-manager-app]");
  if (mountTarget instanceof HTMLElement) {
    mountTarget.replaceChildren(
      Object.assign(document.createElement("pre"), {
        textContent: `Project Manager failed to boot.\nsource: ${PROJECT_MANAGER_UI_SOURCE}\npath: ${window.location.pathname}\nerror: ${message}`
      })
    );
  }
});
