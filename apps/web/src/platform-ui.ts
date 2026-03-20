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
  ":root { --bg: #fafafa; --panel: #ffffff; --panel-soft: #f5f5f5; --line: #e5e5e5; --text: #171717; --muted: #737373; --accent: #14b8a6; --accent-deep: #0f766e; --shadow: 0 24px 80px rgba(23,23,23,0.06); }",
  "* { box-sizing: border-box; }",
  "[hidden] { display: none !important; }",
  "body { margin: 0; font-family: 'Manrope', 'Avenir Next', 'Segoe UI', sans-serif; color: var(--text); background: var(--bg); }",
  ".shell { width: min(1280px, calc(100% - 32px)); margin: 24px auto 40px; }",
  ".hero { margin-bottom: 18px; border: 1px solid var(--line); background: var(--panel); box-shadow: var(--shadow); padding: 20px; }",
  ".hero-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 320px); gap: 20px; align-items: start; }",
  ".eyebrow { display: inline-flex; align-items: center; gap: 8px; margin: 0 0 14px; border: 1px solid var(--text); padding: 6px 10px; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; }",
  ".eyebrow-accent { background: var(--accent); color: #ffffff; padding: 3px 7px; }",
  ".hero h1 { margin: 0; font-size: clamp(1.9rem, 3vw, 3rem); line-height: 0.98; letter-spacing: -0.04em; font-weight: 800; }",
  ".hero-lede { margin: 10px 0 0; max-width: 48rem; color: var(--muted); font-size: 0.93rem; line-height: 1.55; }",
  ".service-card { border: 1px solid var(--line); background: var(--panel-soft); padding: 16px; }",
  ".service-card p { margin: 10px 0 0; color: var(--muted); font-size: 0.83rem; }",
  ".service-card code { font-family: 'JetBrains Mono', 'SFMono-Regular', monospace; font-size: 0.82rem; }",
  ".app-shell { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 24px; }",
  ".sidebar { display: grid; gap: 16px; align-content: start; }",
  ".content-stack { display: grid; gap: 18px; }",
  ".section-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; align-items: start; }",
  ".panel { border: 1px solid var(--line); background: var(--panel); box-shadow: var(--shadow); padding: 18px; }",
  ".panel h2 { margin: 0 0 14px; font-size: 0.82rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.16em; color: var(--muted); }",
  ".panel-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }",
  ".panel-head h2 { margin: 0; }",
  ".panel-note { margin: 0; color: var(--muted); font-size: 0.92rem; line-height: 1.6; }",
  ".route-copy { gap: 4px; }",
  ".route-copy strong { font-size: 1rem; letter-spacing: -0.02em; }",
  ".stack { display: grid; gap: 14px; }",
  ".summary, .version-diff, [data-project-detail] { min-height: 100%; }",
  "label { display: grid; gap: 6px; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--muted); }",
  "input, textarea, button { font: inherit; }",
  "input, textarea { width: 100%; padding: 12px 14px; border: 1px solid #d4d4d4; background: var(--panel); color: var(--text); outline: none; transition: border-color 120ms ease, box-shadow 120ms ease; }",
  "input:focus, textarea:focus { border-color: var(--text); box-shadow: 0 0 0 3px rgba(20,184,166,0.14); }",
  "textarea { min-height: 160px; resize: vertical; }",
  "button { border: 1px solid transparent; padding: 12px 16px; background: var(--text); color: #ffffff; font-weight: 700; cursor: pointer; transition: background 120ms ease, border-color 120ms ease, color 120ms ease; }",
  "button:hover { background: #262626; }",
  "button[disabled] { cursor: not-allowed; opacity: 0.55; }",
  ".ghost { background: transparent; color: var(--text); border-color: #d4d4d4; }",
  ".ghost:hover { background: var(--panel-soft); border-color: var(--text); }",
  ".status-pill { display: inline-flex; align-items: center; border: 1px solid #ccfbf1; background: #f0fdfa; color: var(--accent-deep); padding: 7px 10px; font-size: 0.78rem; font-weight: 700; }",
  ".action-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }",
  ".route-nav { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }",
  ".route-link { display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--line); background: var(--panel); color: var(--text); text-decoration: none; padding: 12px 14px; font-weight: 700; transition: border-color 120ms ease, background 120ms ease; }",
  ".route-link:hover { border-color: #a3a3a3; background: var(--panel-soft); }",
  ".route-link.is-active { border-color: #99f6e4; background: #f0fdfa; color: var(--accent-deep); box-shadow: inset 0 0 0 1px rgba(20,184,166,0.18); }",
  "ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }",
  "li { margin: 0; }",
  ".project-link { display: flex; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 1px solid var(--line); background: var(--panel); color: inherit; text-decoration: none; transition: border-color 120ms ease, background 120ms ease; }",
  ".project-link:hover { border-color: #a3a3a3; background: var(--panel-soft); }",
  ".project-link.is-active { border-color: #99f6e4; background: #f0fdfa; box-shadow: inset 0 0 0 1px rgba(20,184,166,0.18); }",
  ".project-link strong, .task-row strong { display: block; }",
  ".project-link span, .task-row span { color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.12em; }",
  ".task-row { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 12px; text-align: left; padding: 12px 14px; background: var(--panel); color: var(--text); border: 1px solid var(--line); transition: border-color 120ms ease, background 120ms ease; }",
  ".task-row:hover { border-color: #a3a3a3; background: var(--panel-soft); }",
  ".task-row.is-active { border-color: #99f6e4; background: #f0fdfa; box-shadow: inset 0 0 0 1px rgba(20,184,166,0.18); }",
  ".summary ul li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line); }",
  ".workspace-panel { display: grid; gap: 14px; }",
  ".workspace-grid { display: grid; grid-template-columns: minmax(250px, 300px) minmax(0, 1fr); gap: 16px; align-items: start; }",
  ".tree-dir { padding-top: 8px; padding-bottom: 6px; color: var(--muted); font-size: 0.76rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; }",
  ".file-link { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 12px; text-align: left; padding-top: 10px; padding-bottom: 10px; border: 1px solid var(--line); background: var(--panel); color: var(--text); }",
  ".file-link small { color: var(--muted); font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.12em; }",
  ".file-link.is-active { border-color: #99f6e4; background: #f0fdfa; box-shadow: inset 0 0 0 1px rgba(20,184,166,0.18); }",
  ".file-preview-head { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--line); color: var(--muted); }",
  ".file-preview-head strong { color: var(--text); }",
  ".file-editor { display: grid; gap: 12px; margin-top: 14px; }",
  ".file-editor textarea { min-height: 420px; padding: 16px; border: 1px solid var(--line); background: #fafafa; color: #171717; font-family: 'JetBrains Mono', 'SFMono-Regular', monospace; font-size: 0.85rem; line-height: 1.6; }",
  ".file-actions { display: flex; justify-content: flex-end; }",
  ".version-grid { display: grid; grid-template-columns: minmax(250px, 300px) minmax(0, 1fr); gap: 16px; align-items: start; }",
  ".version-actions { display: flex; justify-content: flex-end; }",
  ".version-diff { border-left: 1px solid var(--line); padding-left: 16px; }",
  ".version-diff p { margin: 0 0 10px; color: var(--muted); }",
  ".version-diff code, .summary code { color: var(--accent-deep); }",
  ".meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }",
  ".meta-grid span { display: grid; gap: 4px; padding: 10px 12px; border: 1px solid var(--line); background: var(--panel-soft); color: var(--muted); }",
  ".meta-grid strong { color: var(--text); font-size: 0.74rem; letter-spacing: 0.14em; text-transform: uppercase; }",
  ".project-runtime { color: var(--accent-deep); text-decoration: none; font-weight: 700; }",
  ".summary h3, .version-diff h3 { margin: 0 0 12px; font-size: 1.25rem; line-height: 1.2; }",
  ".summary p { margin: 0 0 10px; color: var(--muted); }",
  ".overview-shell { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.9fr); gap: 18px; align-items: start; }",
  ".overview-main { display: grid; gap: 14px; }",
  ".overview-main .panel-note { max-width: 48rem; }",
  ".overview-side { display: grid; gap: 12px; }",
  ".overview-stat { border: 1px solid var(--line); background: var(--panel-soft); padding: 14px; }",
  ".overview-stat strong { display: block; font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--muted); }",
  ".overview-stat span { display: block; margin-top: 8px; font-size: 1rem; font-weight: 700; }",
  ".overview-stat p { margin: 8px 0 0; color: var(--muted); line-height: 1.55; }",
  ".overview-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }",
  ".ai-panel { display: grid; gap: 20px; }",
  ".ai-task-grid { grid-template-columns: minmax(280px, 340px) minmax(0, 1fr); }",
  ".composer-toggle { white-space: nowrap; }",
  ".error { color: #9a2c1f; }",
  "@media (max-width: 1100px) { .app-shell, .section-grid { grid-template-columns: 1fr; } .sidebar { position: static; } }",
  "@media (min-width: 1101px) { .sidebar { position: sticky; top: 24px; } }",
  "@media (max-width: 900px) { .hero-grid, .meta-grid, .workspace-grid, .version-grid, .action-row, .route-nav, .overview-shell, .overview-actions, .ai-task-grid { grid-template-columns: 1fr; } .shell { width: min(100% - 20px, 1280px); margin-top: 20px; } .panel, .service-card, .hero { padding: 18px; } .version-diff { border-left: 0; border-top: 1px solid var(--line); padding-left: 0; padding-top: 16px; } }"
].join("\n");

function renderHeroSection(pathname: string): string {
  return [
    "    <header class=\"hero\">",
    "      <div class=\"hero-grid\">",
    "        <div>",
    "          <p class=\"eyebrow\"><span>Project</span><span class=\"eyebrow-accent\">Control</span></p>",
    "          <h1>Project Manager Control Plane</h1>",
    "          <p class=\"hero-lede\">Route-managed workspace console for editing project files, snapshotting versions, queuing AI tasks, and explicitly applying validated changes back into managed projects.</p>",
    "        </div>",
    "        <section class=\"service-card stack\">",
    "          <label>Admin Token<input data-admin-token placeholder=\"Paste Bearer token for write actions\"></label>",
    "          <p>Active route: <code data-route>" + pathname + "</code></p>",
    "        </section>",
    "      </div>",
    "    </header>"
  ].join("\n");
}

function renderSidebar(): string {
  return [
    "      <aside class=\"sidebar\">",
    "        <section class=\"panel stack\">",
    "          <h2>Projects</h2>",
    "          <ul class=\"project-list\" data-project-list><li>Loading projects...</li></ul>",
    "        </section>",
    "        <section class=\"panel stack summary\" data-project-detail>",
    "          <p>Loading project snapshot...</p>",
    "        </section>",
    "      </aside>"
  ].join("\n");
}

function renderMainContent(): string {
  return [
    "      <main class=\"content-stack\">",
    "        <section class=\"panel stack\">",
    "          <div class=\"panel-head\"><h2>Focused Route</h2><span class=\"status-pill\" data-status>Control plane ready.</span></div>",
    "          <p class=\"panel-note\" data-section-copy>Keep the landing route focused on project context and the next action only.</p>",
    "          <nav class=\"route-nav\" data-section-nav><p class=\"panel-note\">Select a project to open a focused route.</p></nav>",
    "        </section>",
    "        <section class=\"panel stack summary\" data-overview-panel>",
    "          <p>Select a project to view a quieter overview.</p>",
    "        </section>",
    "        <section class=\"panel workspace-panel\" data-workspace-panel>",
    "          <div class=\"panel-head\"><h2>Project Workspace</h2></div>",
    "          <p class=\"panel-note\">Use proximity and continuity: navigate files from the left, keep the active document and save action on the right, and treat this panel as the primary editing surface.</p>",
    "          <div class=\"workspace-grid\">",
    "            <div data-file-tree><p>Loading workspace...</p></div>",
    "            <div data-file-preview><p>Select a file to inspect its current project content.</p></div>",
    "          </div>",
    "        </section>",
    "        <section class=\"panel stack\" data-versions-panel>",
    "          <h2>Project Versions</h2>",
    "          <p class=\"panel-note\">Capture stable snapshots before large edits, inspect diff against current source, then restore with an explicit control-plane action.</p>",
    "          <label>Snapshot Message<input data-version-message placeholder=\"capture landing-a before homepage rewrite\"></label>",
    "          <div class=\"version-actions\">",
    "            <button type=\"button\" data-create-version>Create Snapshot</button>",
    "          </div>",
    "          <div class=\"version-grid\">",
    "            <ul data-version-list><li>No versions yet.</li></ul>",
    "            <div class=\"stack version-diff\">",
    "              <div data-version-diff><p>Select a version to inspect its diff against the current project.</p></div>",
    "              <div class=\"version-actions\">",
    "                <button type=\"button\" class=\"ghost\" data-restore-version disabled>Restore Selected</button>",
    "              </div>",
    "            </div>",
    "          </div>",
    "        </section>",
    "        <section class=\"ai-panel\" data-ai-panel>",
    "          <article class=\"panel stack\">",
    "            <div class=\"panel-head\"><div class=\"stack route-copy\"><h2>AI Task Flow</h2><p class=\"panel-note\">Keep task review visible and open the composer only when you need to draft a new task.</p></div><button type=\"button\" class=\"ghost composer-toggle\" data-ai-compose-toggle>New Task</button></div>",
    "            <form class=\"stack\" data-ai-form data-ai-compose-body hidden>",
    "              <label>Project Slug<input data-project-slug placeholder=\"landing-a\"></label>",
    "              <label>Task Slug<input data-task-slug placeholder=\"hero-refresh\"></label>",
    "              <label>Prompt<textarea data-prompt placeholder=\"Rewrite the landing page hero for a sharper product position.\"></textarea></label>",
    "              <div class=\"action-row\">",
    "                <button type=\"submit\">Enqueue Task</button>",
    "                <button type=\"button\" class=\"ghost\" data-apply-task disabled>Apply Selected</button>",
    "              </div>",
    "            </form>",
    "          </article>",
    "          <section class=\"section-grid ai-task-grid\">",
    "            <article class=\"panel stack\">",
    "              <h2>AI Tasks</h2>",
    "              <ul data-task-list><li>No AI tasks yet.</li></ul>",
    "            </article>",
    "            <article class=\"panel summary\" data-task-summary>",
    "              <p>No AI task selected.</p>",
    "            </article>",
    "          </section>",
    "        </section>",
    "      </main>"
  ].join("\n");
}

function renderPlatformBody(pathname: string): string {
  return [
    "  <div class=\"shell\">",
    renderHeroSection(pathname),
    "    <div class=\"app-shell\">",
    renderSidebar(),
    renderMainContent(),
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
    "  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">",
    "  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>",
    "  <link href=\"https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap\" rel=\"stylesheet\">",
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
