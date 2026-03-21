import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from "vue";
import aceCoreUrl from "ace-builds/src-noconflict/ace.js?url";
import aceModeCssUrl from "ace-builds/src-noconflict/mode-css.js?url";
import aceModeHtmlUrl from "ace-builds/src-noconflict/mode-html.js?url";
import aceModeJavascriptUrl from "ace-builds/src-noconflict/mode-javascript.js?url";
import aceModeJsonUrl from "ace-builds/src-noconflict/mode-json.js?url";
import aceModeMarkdownUrl from "ace-builds/src-noconflict/mode-markdown.js?url";
import aceModeTypescriptUrl from "ace-builds/src-noconflict/mode-typescript.js?url";
import aceModeXmlUrl from "ace-builds/src-noconflict/mode-xml.js?url";
import aceThemeGithubUrl from "ace-builds/src-noconflict/theme-github.js?url";

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

interface AceModuleLike {
  edit(target: Element): AceEditorLike;
}

interface AceWindowLike {
  ace?: AceModuleLike;
}

const modeLoaders = {
  css: () => loadScript("ace-mode-css", aceModeCssUrl),
  html: () => loadScript("ace-mode-html", aceModeHtmlUrl),
  javascript: () => loadScript("ace-mode-javascript", aceModeJavascriptUrl),
  json: () => loadScript("ace-mode-json", aceModeJsonUrl),
  markdown: () => loadScript("ace-mode-markdown", aceModeMarkdownUrl),
  text: () => Promise.resolve(),
  typescript: () => loadScript("ace-mode-typescript", aceModeTypescriptUrl),
  xml: () => loadScript("ace-mode-xml", aceModeXmlUrl)
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

const scriptLoads = new Map<string, Promise<void>>();

function loadScript(id: string, src: string): Promise<void> {
  const existing = scriptLoads.get(id);
  if (existing !== undefined) {
    return existing;
  }

  const pending = new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Ace editor can only load in a browser context."));
      return;
    }

    const found = document.querySelector<HTMLScriptElement>(`script[data-ace-script="${id}"]`);
      if (found !== null) {
      if (found.dataset.loaded === "true") {
        resolve();
        return;
      }
      found.addEventListener("load", () => {
        resolve();
      }, { once: true });
      found.addEventListener("error", () => {
        reject(new Error(`Failed to load Ace asset: ${id}`));
      }, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.aceScript = id;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => {
      reject(new Error(`Failed to load Ace asset: ${id}`));
    }, { once: true });
    document.head.append(script);
  });

  scriptLoads.set(id, pending);
  return pending;
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

    async function createEditor(target: HTMLElement): Promise<AceEditorLike> {
      await loadScript("ace-core", aceCoreUrl);
      const aceModule = (globalThis as AceWindowLike).ace;
      if (aceModule === undefined) {
        throw new Error("Ace editor global failed to initialize.");
      }
      await loadScript("ace-theme-github", aceThemeGithubUrl);
      return aceModule.edit(target);
    }

    async function ensureEditor() {
      if (host.value === null) {
        return;
      }

      try {
        editor = await createEditor(host.value);
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
