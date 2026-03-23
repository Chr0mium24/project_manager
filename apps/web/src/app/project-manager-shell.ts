import {
  computed,
  defineComponent,
  h,
  onMounted,
  ref,
  watch,
  type ComputedRef,
  type Ref,
  type VNode
} from "vue";
import { RouterLink, RouterView, useRoute, useRouter, type RouteLocationNormalizedLoaded, type Router } from "vue-router";
import { GatewayProjectApiClient } from "../gateway-api.ts";
import {
  describeAdminSessionError,
  type AdminAccessAvailability
} from "./project-manager-admin-access.ts";
import { useModalBehavior } from "./project-manager-modal.ts";
import { useProjectContextStore } from "./project-context-store.ts";

export { PROJECT_MANAGER_SHELL_STYLES } from "./project-manager-shell-styles.ts";

interface AccessPanelOptions {
  adminAvailability: AdminAccessAvailability;
  dialogRef: Ref<HTMLElement | null>;
  errorMessage: string | null;
  inputRef: Ref<HTMLElement | null>;
  isAdminMode: boolean;
  isSubmitting: boolean;
  tokenDraft: Ref<string>;
  onCancel(): void;
  onContinue(): void;
  onExitAdminMode(): void;
}

interface ShellAccessState {
  accessPanelOpen: Ref<boolean>;
  adminAvailability: Ref<AdminAccessAvailability>;
  dialogRef: Ref<HTMLElement | null>;
  errorMessage: Ref<string | null>;
  inputRef: Ref<HTMLElement | null>;
  isAdminMode: ComputedRef<boolean>;
  isSubmitting: Ref<boolean>;
  tokenDraft: Ref<string>;
  closeAccessPanel(): void;
  exitAdminMode(): void;
  saveAdminToken(): Promise<void>;
  toggleAccessPanel(): void;
}

interface ShellAccessRefs {
  accessPanelOpen: Ref<boolean>;
  adminAvailability: Ref<AdminAccessAvailability>;
  dialogRef: Ref<HTMLElement | null>;
  errorMessage: Ref<string | null>;
  inputRef: Ref<HTMLElement | null>;
  isAdminMode: ComputedRef<boolean>;
  isSubmitting: Ref<boolean>;
  tokenDraft: Ref<string>;
}

function renderTopbar(
  isAdminMode: boolean,
  adminAvailability: AdminAccessAvailability,
  accessPanelOpen: boolean,
  onToggleAccessPanel: () => void
): VNode {
  const accessDisabled = adminAvailability === "unavailable";
  const accessLabel = accessDisabled
    ? "Admin unavailable"
    : accessPanelOpen
      ? "Close access"
      : (isAdminMode ? "Manage access" : "Admin access");

  return h("header", { class: "pm-topbar" }, [
    h("div", { class: "pm-topbar-inner" }, [
      h(RouterLink, { to: "/projects", class: "pm-brand" }, () => "Project Manager"),
      h("div", { class: "pm-topbar-actions" }, [
        h("button", {
          type: "button",
          class: "pm-project-link",
          disabled: accessDisabled,
          onClick: () => {
            onToggleAccessPanel();
          }
        }, accessLabel),
        accessDisabled
          ? h("p", { class: "pm-topbar-note" }, "Management routes are disabled because the gateway has no admin token configured.")
          : null
      ])
    ])
  ]);
}

function renderAccessPanelCopy(isAdminMode: boolean, managementUnavailable: boolean): VNode {
  return h("div", { class: "pm-page-copy" }, [
    h("p", { class: "pm-kicker" }, "Admin access"),
    h("h2", { id: "pm-access-modal-title", class: "pm-page-title" }, isAdminMode ? "Update admin token" : "Enter admin token"),
    h(
      "p",
      { id: "pm-access-modal-description", class: "pm-copy" },
      managementUnavailable
        ? "This gateway is not configured for admin mode. Management routes stay disabled until the server adds PROJECT_MANAGER_ADMIN_TOKEN."
        : "Visitors stay on the project directory. Enter a valid admin token to open repository management routes."
    )
  ]);
}

function renderAccessPanelForm(options: AccessPanelOptions): VNode {
  return h("form", {
    class: "pm-access-form",
    onSubmit: (event: Event) => {
      event.preventDefault();
      options.onContinue();
    }
  }, [
    h("label", { class: "pm-field pm-field-full" }, [
      h("span", "Admin token"),
      h("input", {
        ref: options.inputRef,
        class: "pm-input",
        type: "password",
        value: options.tokenDraft.value,
        placeholder: "Paste bearer token",
        disabled: options.isSubmitting,
        onInput: (event: Event) => {
          options.tokenDraft.value = (event.target as HTMLInputElement).value;
        }
      })
    ]),
    h("div", { class: "pm-actions pm-actions-end pm-field-full" }, [
      options.isAdminMode
        ? h("button", {
            type: "button",
            class: "pm-button pm-button-ghost",
            disabled: options.isSubmitting,
            onClick: () => {
              options.onExitAdminMode();
            }
          }, "Exit admin mode")
        : null,
      h("button", {
        type: "button",
        class: "pm-button pm-button-ghost",
        disabled: options.isSubmitting,
        onClick: () => {
          options.onCancel();
        }
      }, "Cancel"),
      h("button", {
        type: "submit",
        class: "pm-button",
        disabled: options.isSubmitting
      }, options.isSubmitting ? "Checking..." : "Continue")
    ])
  ]);
}

function renderAccessPanel(options: AccessPanelOptions): VNode {
  const managementUnavailable = options.adminAvailability === "unavailable";

  return h("div", {
    class: "pm-modal-backdrop",
    onClick: (event: Event) => {
      if (event.target === event.currentTarget) {
        options.onCancel();
      }
    }
  }, [
    h("section", {
      ref: options.dialogRef,
      class: "pm-access-modal pm-card",
      role: "dialog",
      tabindex: -1,
      "aria-describedby": "pm-access-modal-description",
      "aria-labelledby": "pm-access-modal-title",
      "aria-modal": "true"
    }, [
      renderAccessPanelCopy(options.isAdminMode, managementUnavailable),
      options.errorMessage === null ? null : h("p", { class: "pm-error" }, options.errorMessage),
      managementUnavailable
        ? h("div", { class: "pm-actions pm-actions-end" }, [
            h("button", {
              type: "button",
              class: "pm-button pm-button-ghost",
              onClick: () => {
                options.onCancel();
              }
            }, "Close")
          ])
        : renderAccessPanelForm(options)
    ])
  ]);
}

function createAccessRefs(context: ReturnType<typeof useProjectContextStore>): ShellAccessRefs {
  return {
    accessPanelOpen: ref(false),
    adminAvailability: ref<AdminAccessAvailability>("loading"),
    dialogRef: ref<HTMLElement | null>(null),
    errorMessage: ref<string | null>(null),
    inputRef: ref<HTMLElement | null>(null),
    isAdminMode: computed(() => context.adminToken.trim().length > 0),
    isSubmitting: ref(false),
    tokenDraft: ref("")
  };
}

function useAccessBootstrap(
  context: ReturnType<typeof useProjectContextStore>,
  tokenDraft: Ref<string>,
  refreshAdminAvailability: () => Promise<void>
): void {
  onMounted(() => {
    if (context.projects.length === 0 && !context.projectsLoading) {
      void context.loadProjects();
    }
    tokenDraft.value = context.adminToken;
    void refreshAdminAvailability();
  });
}

function createAccessState(
  context: ReturnType<typeof useProjectContextStore>,
  gatewayClient: GatewayProjectApiClient
): ShellAccessState {
  const refs = createAccessRefs(context);

  function syncTokenDraft() {
    refs.tokenDraft.value = context.adminToken;
  }

  function closeAccessPanel() {
    refs.errorMessage.value = null;
    refs.accessPanelOpen.value = false;
  }

  function openAccessPanel() {
    if (refs.adminAvailability.value === "unavailable") {
      return;
    }
    syncTokenDraft();
    refs.errorMessage.value = null;
    refs.accessPanelOpen.value = true;
  }

  async function refreshAdminAvailability() {
    try {
      refs.adminAvailability.value = await gatewayClient.probeAdminAccess();
    } catch {
      refs.adminAvailability.value = "unknown";
    }
  }

  async function saveAdminToken() {
    const nextToken = refs.tokenDraft.value.trim();
    if (nextToken.length === 0) {
      refs.errorMessage.value = "Admin token is required.";
      return;
    }

    refs.isSubmitting.value = true;
    refs.errorMessage.value = null;
    try {
      await gatewayClient.verifyAdminSession(nextToken);
      refs.adminAvailability.value = "available";
      context.setAdminToken(nextToken);
      closeAccessPanel();
    } catch (error) {
      const describedError = describeAdminSessionError(error);
      refs.errorMessage.value = describedError.message;
      if (describedError.availability === "unavailable") {
        refs.adminAvailability.value = "unavailable";
        context.clearAdminToken();
      }
    } finally {
      refs.isSubmitting.value = false;
    }
  }

  function clearAdminToken() {
    context.clearAdminToken();
    refs.tokenDraft.value = "";
    closeAccessPanel();
  }

  useAccessBootstrap(context, refs.tokenDraft, refreshAdminAvailability);

  return {
    ...refs,
    closeAccessPanel,
    exitAdminMode: clearAdminToken,
    saveAdminToken,
    toggleAccessPanel: () => {
      if (refs.accessPanelOpen.value) {
        closeAccessPanel();
        return;
      }
      openAccessPanel();
    }
  } as ShellAccessState;
}

function useShellNavigationGuards(
  route: RouteLocationNormalizedLoaded,
  router: Router,
  context: ReturnType<typeof useProjectContextStore>,
  state: ShellAccessState
): void {
  useModalBehavior({
    dialogRef: state.dialogRef,
    initialFocusRef: state.inputRef,
    isOpen: state.accessPanelOpen,
    onClose: state.closeAccessPanel
  });

  watch(state.isAdminMode, (enabled) => {
    if (enabled || route.name === "projects-index") {
      return;
    }
    void router.replace("/projects");
  });
  watch(state.adminAvailability, (availability) => {
    if (availability !== "unavailable") {
      return;
    }
    context.clearAdminToken();
    state.closeAccessPanel();
    if (route.name !== "projects-index") {
      void router.replace("/projects");
    }
  });
}

function renderShellLayout(routeName: string | symbol | null | undefined, state: ShellAccessState): VNode {
  return h("div", { class: "pm-shell" }, [
    h("div", {
      class: "pm-shell-frame",
      inert: state.accessPanelOpen.value ? "" : undefined,
      "aria-hidden": state.accessPanelOpen.value ? "true" : undefined
    }, [
      renderTopbar(state.isAdminMode.value, state.adminAvailability.value, state.accessPanelOpen.value, state.toggleAccessPanel),
      h("main", { class: ["pm-layout", routeName === "projects-index" ? "pm-layout-home" : ""] }, [h(RouterView)])
    ]),
    state.accessPanelOpen.value
      ? renderAccessPanel({
          adminAvailability: state.adminAvailability.value,
          dialogRef: state.dialogRef,
          errorMessage: state.errorMessage.value,
          inputRef: state.inputRef,
          isAdminMode: state.isAdminMode.value,
          isSubmitting: state.isSubmitting.value,
          tokenDraft: state.tokenDraft,
          onCancel: state.closeAccessPanel,
          onContinue: () => {
            void state.saveAdminToken();
          },
          onExitAdminMode: state.exitAdminMode
        })
      : null
  ]);
}

export const ProjectManagerShell = defineComponent({
  name: "ProjectManagerShell",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const context = useProjectContextStore();
    const state = createAccessState(context, new GatewayProjectApiClient());

    useShellNavigationGuards(route, router, context, state);

    return () => renderShellLayout(route.name, state);
  }
});
