import { computed, defineComponent, h, onMounted, ref, type Ref, type VNode } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { useProjectContextStore } from "./project-context-store.ts";
import { GatewayProjectApiClient } from "../gateway-api.ts";

export { PROJECT_MANAGER_SHELL_STYLES } from "./project-manager-shell-styles.ts";

function renderTopbar(
  isAdminMode: boolean,
  accessPanelOpen: boolean,
  onToggleAccessPanel: () => void
): VNode {
  return h("header", { class: "pm-topbar" }, [
    h("div", { class: "pm-topbar-inner" }, [
      h(
        RouterLink,
        {
          to: "/projects",
          class: "pm-brand"
        },
        () => "Project Manager"
      ),
      h("div", { class: "pm-topbar-actions" }, [
        h(
          "button",
          {
            type: "button",
            class: "pm-project-link",
            onClick: () => {
              onToggleAccessPanel();
            }
          },
          accessPanelOpen ? "Close access" : (isAdminMode ? "Manage access" : "Admin access")
        )
      ])
    ])
  ]);
}

interface AccessPanelOptions {
  isAdminMode: boolean;
  tokenDraft: Ref<string>;
  errorMessage: string | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onContinue: () => void;
  onExitAdminMode: () => void;
}

function renderAccessPanel(options: AccessPanelOptions): VNode {
  return h("div", { class: "pm-modal-backdrop" }, [
    h("section", { class: "pm-access-modal pm-card", role: "dialog", "aria-modal": "true" }, [
      h("div", { class: "pm-page-copy" }, [
        h("p", { class: "pm-kicker" }, "Admin access"),
        h("h2", { class: "pm-page-title" }, options.isAdminMode ? "Update admin token" : "Enter admin token"),
        h(
          "p",
          { class: "pm-copy" },
          "Visitors stay on the project directory. Enter a valid admin token to open repository management routes."
        )
      ]),
      options.errorMessage === null ? null : h("p", { class: "pm-error" }, options.errorMessage),
      h("form", {
        class: "pm-access-form",
        onSubmit: (event: Event) => {
          event.preventDefault();
          options.onContinue();
        }
      }, [
        h("label", { class: "pm-field pm-field-full" }, [
          h("span", "Admin token"),
          h("input", {
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
            ? h(
                "button",
                {
                  type: "button",
                  class: "pm-button pm-button-ghost",
                  disabled: options.isSubmitting,
                  onClick: () => {
                    options.onExitAdminMode();
                  }
                },
                "Exit admin mode"
              )
            : null,
          h(
            "button",
            {
              type: "button",
              class: "pm-button pm-button-ghost",
              disabled: options.isSubmitting,
              onClick: () => {
                options.onCancel();
              }
            },
            "Cancel"
          ),
          h(
            "button",
            {
              type: "submit",
              class: "pm-button",
              disabled: options.isSubmitting
            },
            options.isSubmitting ? "Checking..." : "Continue"
          )
        ])
      ])
    ])
  ]);
}

export const ProjectManagerShell = defineComponent({
  name: "ProjectManagerShell",
  setup() {
    const route = useRoute();
    const context = useProjectContextStore();
    const gatewayClient = new GatewayProjectApiClient();
    const accessPanelOpen = ref(false);
    const tokenDraft = ref("");
    const accessError = ref<string | null>(null);
    const accessSubmitting = ref(false);
    const isAdminMode = computed(() => context.adminToken.trim().length > 0);

    function syncTokenDraft() {
      tokenDraft.value = context.adminToken;
    }

    function openAccessPanel() {
      syncTokenDraft();
      accessError.value = null;
      accessPanelOpen.value = true;
    }

    function closeAccessPanel() {
      accessError.value = null;
      accessPanelOpen.value = false;
    }

    function toggleAccessPanel() {
      if (accessPanelOpen.value) {
        closeAccessPanel();
        return;
      }
      openAccessPanel();
    }

    async function saveAdminToken() {
      const nextToken = tokenDraft.value.trim();
      if (nextToken.length === 0) {
        accessError.value = "Admin token is required.";
        return;
      }

      accessSubmitting.value = true;
      accessError.value = null;
      try {
        await gatewayClient.verifyAdminSession(nextToken);
        context.setAdminToken(nextToken);
        closeAccessPanel();
      } catch (error) {
        accessError.value = error instanceof Error ? error.message : "Unable to verify admin token.";
      } finally {
        accessSubmitting.value = false;
      }
    }

    function clearAdminToken() {
      context.clearAdminToken();
      tokenDraft.value = "";
      closeAccessPanel();
    }

    onMounted(() => {
      if (context.projects.length === 0 && !context.projectsLoading) {
        void context.loadProjects();
      }
      syncTokenDraft();
    });

    return () =>
      h("div", { class: "pm-shell" }, [
        renderTopbar(isAdminMode.value, accessPanelOpen.value, toggleAccessPanel),
        accessPanelOpen.value
          ? renderAccessPanel({
              isAdminMode: isAdminMode.value,
              tokenDraft,
              errorMessage: accessError.value,
              isSubmitting: accessSubmitting.value,
              onCancel: closeAccessPanel,
              onContinue: () => {
                void saveAdminToken();
              },
              onExitAdminMode: clearAdminToken
            })
          : null,
        h("main", { class: ["pm-layout", route.name === "projects-index" ? "pm-layout-home" : ""] }, [h(RouterView)])
      ]);
  }
});
