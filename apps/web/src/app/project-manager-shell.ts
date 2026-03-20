import { computed, defineComponent, h, onMounted, ref, type Ref, type VNode } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { useProjectContextStore } from "./project-context-store.ts";

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
  onCancel: () => void;
  onContinue: () => void;
  onExitAdminMode: () => void;
}

function renderAccessPanel(options: AccessPanelOptions): VNode {
  return h("section", { class: "pm-access-panel" }, [
    h("div", { class: "pm-access-panel-inner" }, [
      h("div", { class: "pm-page-copy" }, [
        h("p", { class: "pm-kicker" }, "Admin access"),
        h("h2", { class: "pm-page-title" }, options.isAdminMode ? "Update admin token" : "Enter admin token"),
        h(
          "p",
          { class: "pm-copy" },
          "Visitors stay on the project directory. Enter a valid admin token to open repository management routes."
        )
      ]),
      h("div", { class: "pm-access-form" }, [
        h("label", { class: "pm-field pm-field-full" }, [
          h("span", "Admin token"),
          h("input", {
            class: "pm-input",
            type: "password",
            value: options.tokenDraft.value,
            placeholder: "Paste bearer token",
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
              onClick: () => {
                options.onCancel();
              }
            },
            "Cancel"
          ),
          h(
            "button",
            {
              type: "button",
              class: "pm-button",
              onClick: () => {
                options.onContinue();
              }
            },
            "Continue"
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
    const accessPanelOpen = ref(false);
    const tokenDraft = ref("");
    const isAdminMode = computed(() => context.adminToken.trim().length > 0);

    function syncTokenDraft() {
      tokenDraft.value = context.adminToken;
    }

    function openAccessPanel() {
      syncTokenDraft();
      accessPanelOpen.value = true;
    }

    function closeAccessPanel() {
      accessPanelOpen.value = false;
    }

    function toggleAccessPanel() {
      if (accessPanelOpen.value) {
        closeAccessPanel();
        return;
      }
      openAccessPanel();
    }

    function saveAdminToken() {
      context.setAdminToken(tokenDraft.value.trim());
      closeAccessPanel();
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
              onCancel: closeAccessPanel,
              onContinue: saveAdminToken,
              onExitAdminMode: clearAdminToken
            })
          : null,
        h("main", { class: ["pm-layout", route.name === "projects-index" ? "pm-layout-home" : ""] }, [h(RouterView)])
      ]);
  }
});
