import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as ace from "ace-builds";
import "ace-builds/esm-resolver";

interface AceSessionLike {
  on(eventName: "change", callback: () => void): void;
  setMode(mode: string): void;
  setUseWorker(enabled: boolean): void;
  setValue(value: string): void;
}

interface AceEditorLike {
  session: AceSessionLike;
  destroy(): void;
  getValue(): string;
  resize(): void;
  setOption(name: string, value: unknown): void;
  setTheme(theme: string): void;
}

const modeLoaders = {
  css: () => Promise.resolve(),
  html: () => Promise.resolve(),
  javascript: () => Promise.resolve(),
  json: () => Promise.resolve(),
  markdown: () => Promise.resolve(),
  text: () => Promise.resolve(),
  typescript: () => Promise.resolve(),
  xml: () => Promise.resolve()
} satisfies Record<string, () => Promise<unknown>>;

const fileModeMatchers: Array<[keyof typeof modeLoaders, RegExp]> = [
  ["css", /\.css$/],
  ["html", /\.html$/],
  ["javascript", /\.(?:js|mjs)$/],
  ["json", /\.json$/],
  ["markdown", /\.md$/],
  ["typescript", /\.(?:ts|tsx)$/],
  ["xml", /\.(?:svg|xml)$/]
];

function resolveMode(filePath: string): keyof typeof modeLoaders {
  for (const [mode, pattern] of fileModeMatchers) {
    if (pattern.test(filePath)) {
      return mode;
    }
  }

  return "text";
}

async function loadEditorMode(filePath: string, editor: AceEditorLike): Promise<void> {
  const mode = resolveMode(filePath);
  await modeLoaders[mode]();
  editor.session.setUseWorker(false);
  editor.session.setMode(`ace/mode/${mode}`);
}

function configureEditor(editor: AceEditorLike): void {
  editor.setTheme("ace/theme/github");
  editor.setOption("showPrintMargin", false);
  editor.setOption("fontSize", 13);
  editor.setOption("tabSize", 2);
  editor.setOption("useSoftTabs", true);
  editor.setOption("wrap", true);
}

export const ProjectManagerAceEditor = defineComponent({
  name: "ProjectManagerAceEditor",
  props: {
    filePath: { type: String, required: true },
    modelValue: { type: String, required: true }
  },
  emits: {
    loadError: (_message: string) => true,
    "update:modelValue": (_value: string) => true
  },
  setup(props, { emit }) {
    const host = ref<HTMLElement | null>(null);
    const loadError = ref<string | null>(null);
    let editor: AceEditorLike | null = null;
    let syncing = false;

    function setEditorValue(nextValue: string): void {
      if (editor === null || editor.getValue() === nextValue) {
        return;
      }
      syncing = true;
      editor.session.setValue(nextValue);
      syncing = false;
      editor.resize();
    }

    function attachChangeListener(): void {
      if (editor === null) {
        return;
      }
      editor.session.on("change", () => {
        if (syncing || editor === null) {
          return;
        }
        emit("update:modelValue", editor.getValue());
      });
    }

    function createEditor(target: HTMLElement): AceEditorLike {
      return ace.edit(target) as unknown as AceEditorLike;
    }

    async function ensureEditor() {
      if (host.value === null) {
        return;
      }

      try {
        editor = createEditor(host.value);
        configureEditor(editor);
        attachChangeListener();
        await loadEditorMode(props.filePath, editor);
        setEditorValue(props.modelValue);
        loadError.value = null;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load Ace editor.";
        loadError.value = message;
        emit("loadError", message);
      }
    }

    watch(() => props.modelValue, (nextValue) => {
      setEditorValue(nextValue);
    });

    watch(() => props.filePath, async (nextPath) => {
      if (editor === null) {
        return;
      }
      await loadEditorMode(nextPath, editor);
      editor.resize();
    });

    onMounted(() => {
      void ensureEditor();
    });

    onBeforeUnmount(() => {
      editor?.destroy();
      editor = null;
    });

    return () =>
      loadError.value === null
        ? h("div", { ref: host, class: "pm-editor pm-ace-editor-host" })
        : h("div", { class: "pm-editor pm-ace-editor-fallback" }, loadError.value);
  }
});
