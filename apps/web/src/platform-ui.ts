import { PLATFORM_UI_SCRIPT } from "./platform-ui-script.ts";

export interface PlatformAsset {
  body: string;
  contentType: string;
}

export interface PlatformDocumentInput {
  pathname: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

const PLATFORM_UI_STYLES = [
  ":root { --bg: #f2ece2; --panel: rgba(255,255,255,0.82); --line: rgba(33,30,24,0.12); --text: #1f1b17; --muted: #6b6258; --accent: #c65d2e; --shadow: 0 24px 80px rgba(43,31,17,0.12); }",
  "* { box-sizing: border-box; }",
  "body { margin: 0; font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif; color: var(--text); background: radial-gradient(circle at top, rgba(198,93,46,0.18), transparent 34%), linear-gradient(180deg, #f8f4ed 0%, #efe5d7 100%); }",
  ".shell { width: min(1180px, calc(100% - 32px)); margin: 32px auto 48px; }",
  ".hero { padding: 28px; border: 1px solid var(--line); background: var(--panel); box-shadow: var(--shadow); backdrop-filter: blur(12px); }",
  ".hero h1 { margin: 0 0 8px; font-size: clamp(2rem, 5vw, 4.6rem); line-height: 0.95; letter-spacing: -0.04em; }",
  ".hero p { margin: 0; max-width: 54rem; color: var(--muted); font-size: 1.05rem; }",
  ".hero code { font-size: 0.9rem; }",
  ".metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 18px; }",
  ".metric { border-top: 1px solid var(--line); padding-top: 12px; }",
  ".metric strong { display: block; font-size: 0.75rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }",
  ".metric span { display: block; margin-top: 6px; font-size: 1.1rem; }",
  ".layout { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 20px; margin-top: 20px; }",
  ".panel { border: 1px solid var(--line); background: var(--panel); box-shadow: var(--shadow); padding: 22px; }",
  ".panel h2 { margin: 0 0 14px; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.18em; }",
  ".stack { display: grid; gap: 14px; }",
  "label { display: grid; gap: 6px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); }",
  "input, textarea, button { font: inherit; }",
  "input, textarea { width: 100%; padding: 12px 14px; border: 1px solid var(--line); background: rgba(255,255,255,0.78); color: var(--text); }",
  "textarea { min-height: 160px; resize: vertical; }",
  "button { border: 1px solid transparent; padding: 12px 16px; background: var(--accent); color: #fff8f2; cursor: pointer; }",
  "button[disabled] { cursor: not-allowed; opacity: 0.55; }",
  ".ghost { background: transparent; color: var(--text); border-color: var(--line); }",
  "ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }",
  "li { margin: 0; }",
  ".project-link { display: flex; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 1px solid var(--line); background: rgba(255,255,255,0.72); color: inherit; text-decoration: none; }",
  ".project-link.is-active { border-color: rgba(198,93,46,0.45); box-shadow: inset 0 0 0 1px rgba(198,93,46,0.22); }",
  ".project-link strong, .task-row strong { display: block; }",
  ".project-link span, .task-row span { color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.12em; }",
  ".task-row { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 12px; text-align: left; padding: 12px 14px; background: rgba(255,255,255,0.7); color: var(--text); border: 1px solid var(--line); }",
  ".task-row.is-active { border-color: rgba(198,93,46,0.45); box-shadow: inset 0 0 0 1px rgba(198,93,46,0.22); }",
  ".summary ul li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line); }",
  ".workspace-grid { display: grid; grid-template-columns: minmax(260px, 320px) minmax(0, 1fr); gap: 16px; align-items: start; }",
  ".tree-dir { padding-top: 8px; padding-bottom: 6px; color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.12em; }",
  ".file-link { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 12px; text-align: left; padding-top: 10px; padding-bottom: 10px; border: 1px solid var(--line); background: rgba(255,255,255,0.66); color: var(--text); }",
  ".file-link small { color: var(--muted); font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.12em; }",
  ".file-link.is-active { border-color: rgba(198,93,46,0.45); box-shadow: inset 0 0 0 1px rgba(198,93,46,0.22); }",
  ".file-preview-head { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--line); color: var(--muted); }",
  ".file-preview-head strong { color: var(--text); }",
  ".workspace-grid pre { margin: 14px 0 0; padding: 16px; overflow: auto; border: 1px solid var(--line); background: rgba(30,24,18,0.94); color: #f9efe4; font-family: 'SFMono-Regular', 'JetBrains Mono', Consolas, monospace; font-size: 0.86rem; line-height: 1.5; }",
  ".meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }",
  ".meta-grid span { display: grid; gap: 4px; padding: 10px 12px; border: 1px solid var(--line); background: rgba(255,255,255,0.62); color: var(--muted); }",
  ".meta-grid strong { color: var(--text); font-size: 0.74rem; letter-spacing: 0.14em; text-transform: uppercase; }",
  ".project-runtime { color: var(--accent); text-decoration: none; font-weight: 600; }",
  ".summary h3 { margin: 0 0 12px; font-size: 1.4rem; }",
  ".summary p { margin: 0 0 10px; color: var(--muted); }",
  ".error { color: #9a2c1f; }",
  "@media (max-width: 900px) { .metrics, .layout, .meta-grid, .workspace-grid { grid-template-columns: 1fr; } .shell { width: min(100% - 20px, 1180px); margin-top: 20px; } .hero, .panel { padding: 18px; } }"
].join("\n");

function renderPlatformBody(pathname: string): string {
  return [
    "  <div class=\"shell\">",
    "    <header class=\"hero\">",
    "      <h1>Project Manager Control Plane</h1>",
    "      <p>Queue Codex workspaces, inspect AI artifacts, and explicitly apply validated results back into managed projects from one path-routed front door.</p>",
    "      <p>Active route: <code data-route>" + pathname + "</code></p>",
    "      <section class=\"metrics\">",
    "        <article class=\"metric\"><strong>Ingress</strong><span>Single-port gateway</span></article>",
    "        <article class=\"metric\"><strong>Workflow</strong><span>Queue -> Summary -> Apply</span></article>",
    "        <article class=\"metric\"><strong>Mode</strong><span>Managed project control plane</span></article>",
    "      </section>",
    "    </header>",
    "    <div class=\"layout\">",
    "      <aside class=\"panel stack\">",
    "        <section class=\"stack\">",
    "          <h2>Projects</h2>",
    "          <ul class=\"project-list\" data-project-list><li>Loading projects...</li></ul>",
    "        </section>",
    "        <section class=\"stack summary\" data-project-detail>",
    "          <p>Loading project snapshot...</p>",
    "        </section>",
    "        <section class=\"stack\">",
    "          <h2>Auth</h2>",
    "          <label>Admin Token<input data-admin-token placeholder=\"Paste Bearer token for POST /apply\"></label>",
    "        </section>",
    "      </aside>",
    "      <main class=\"stack\">",
    "        <section class=\"panel stack\">",
    "          <h2>New AI Task</h2>",
    "          <form class=\"stack\" data-ai-form>",
    "            <label>Project Slug<input data-project-slug placeholder=\"landing-a\"></label>",
    "            <label>Task Slug<input data-task-slug placeholder=\"hero-refresh\"></label>",
    "            <label>Prompt<textarea data-prompt placeholder=\"Rewrite the landing page hero for a sharper product position.\"></textarea></label>",
    "            <div class=\"stack\" style=\"grid-template-columns: repeat(2, minmax(0, 1fr));\">",
    "              <button type=\"submit\">Enqueue Task</button>",
    "              <button type=\"button\" class=\"ghost\" data-apply-task disabled>Apply Selected</button>",
    "            </div>",
    "          </form>",
    "          <p data-status>Control plane ready.</p>",
    "        </section>",
    "        <section class=\"panel stack\">",
    "          <h2>Project Workspace</h2>",
    "          <div class=\"workspace-grid\">",
    "            <div data-file-tree><p>Loading workspace...</p></div>",
    "            <div data-file-preview><p>Select a file to inspect its current project content.</p></div>",
    "          </div>",
    "        </section>",
    "        <section class=\"panel stack\">",
    "          <h2>AI Tasks</h2>",
    "          <ul data-task-list><li>No AI tasks yet.</li></ul>",
    "        </section>",
    "        <section class=\"panel summary\" data-task-summary>",
    "          <p>No AI task selected.</p>",
    "        </section>",
    "      </main>",
    "    </div>",
    "  </div>",
    "  <script>window.__PROJECT_MANAGER_PLATFORM__ = { pathname: \"" + pathname + "\" };</script>",
    "  <script type=\"module\" src=\"/assets/platform-ui.js\"></script>"
  ].join("\n");
}

export function renderPlatformDocument(input: PlatformDocumentInput): string {
  const pathname = escapeHtml(input.pathname);
  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "  <meta charset=\"utf-8\">",
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "  <title>Project Manager Control Plane</title>",
    "  <style>",
    PLATFORM_UI_STYLES,
    "  </style>",
    "</head>",
    "<body>",
    renderPlatformBody(pathname),
    "</body>",
    "</html>"
  ].join("\n");
}

export function readPlatformAsset(pathname: string): PlatformAsset | null {
  if (pathname !== "/assets/platform-ui.js") {
    return null;
  }

  return {
    body: `${PLATFORM_UI_SCRIPT}\n`,
    contentType: "text/javascript; charset=utf-8"
  };
}
