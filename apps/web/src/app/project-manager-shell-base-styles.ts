export const PROJECT_MANAGER_SHELL_BASE_STYLES = `
:root {
  --pm-bg: #f6f8fa;
  --pm-bg-subtle: #f3f4f6;
  --pm-panel: #ffffff;
  --pm-panel-soft: #f6f8fa;
  --pm-line: #d0d7de;
  --pm-line-strong: #8c959f;
  --pm-text: #1f2328;
  --pm-muted: #59636e;
  --pm-accent: #0969da;
  --pm-accent-soft: #ddf4ff;
  --pm-accent-strong: #0550ae;
  --pm-success: #1a7f37;
  --pm-danger: #cf222e;
  --pm-shadow: 0 1px 0 rgba(31, 35, 40, 0.04);
  --pm-radius: 10px;
}
* { box-sizing: border-box; }
html, body, #app { min-height: 100%; }
body {
  margin: 0;
  background: var(--pm-bg);
  color: var(--pm-text);
  font-family: "Manrope", "Avenir Next", "Segoe UI", sans-serif;
  line-height: 1.5;
}
a, button, input, textarea { font: inherit; }
button { color: inherit; }
.pm-shell { min-height: 100vh; }
.pm-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(246, 248, 250, 0.92);
  border-bottom: 1px solid var(--pm-line);
  backdrop-filter: blur(10px);
}
.pm-topbar-inner {
  width: min(1360px, calc(100% - 32px));
  margin: 0 auto;
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.pm-brand {
  color: var(--pm-text);
  text-decoration: none;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.pm-topbar-meta {
  color: var(--pm-muted);
  font-size: 0.85rem;
  font-weight: 600;
}
.pm-layout {
  width: min(1360px, calc(100% - 32px));
  margin: 24px auto 40px;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 24px;
}
.pm-sidebar {
  position: sticky;
  top: 88px;
  align-self: start;
  display: grid;
  gap: 16px;
}
.pm-sidebar-section,
.pm-card {
  border: 1px solid var(--pm-line);
  border-radius: var(--pm-radius);
  background: var(--pm-panel);
  box-shadow: var(--pm-shadow);
}
.pm-sidebar-section { padding: 16px; }
.pm-sidebar-title {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pm-muted);
}
.pm-sidebar-copy {
  margin: 0;
  color: var(--pm-muted);
  font-size: 0.86rem;
}
.pm-link-list,
.pm-main,
.pm-view,
.pm-stack,
.pm-page-copy,
.pm-project-main,
.pm-project-actions,
.pm-editor-stack {
  display: grid;
  gap: 12px;
}
.pm-main { align-content: start; }
.pm-side-link {
  display: grid;
  gap: 4px;
  text-decoration: none;
  color: var(--pm-text);
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}
.pm-side-link:hover {
  background: var(--pm-panel-soft);
  border-color: var(--pm-line);
}
.pm-side-link.is-active {
  background: var(--pm-accent-soft);
  border-color: #b6e3ff;
  color: var(--pm-accent-strong);
}
.pm-link-copy strong {
  font-size: 0.93rem;
  line-height: 1.2;
}
.pm-link-copy small,
.pm-kicker,
.pm-project-meta span,
.pm-tree-button small,
.pm-list-button small {
  color: var(--pm-muted);
  font-size: 0.78rem;
}
.pm-card { padding: 20px; }
.pm-page-header-card {
  gap: 18px;
  padding: 20px 24px 12px;
}
.pm-page-head-top {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 16px;
}
.pm-page-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  font-size: 0.84rem;
  color: var(--pm-muted);
}
.pm-page-breadcrumb a {
  color: var(--pm-muted);
  text-decoration: none;
  font-weight: 700;
}
.pm-page-breadcrumb a:hover { color: var(--pm-accent-strong); }
.pm-page-title,
.pm-title {
  margin: 0;
  letter-spacing: -0.03em;
  line-height: 1.15;
}
.pm-title { font-size: clamp(1.8rem, 2.8vw, 2.4rem); }
.pm-page-title { font-size: clamp(1.35rem, 2.2vw, 1.8rem); }
.pm-copy {
  margin: 0;
  color: var(--pm-muted);
  line-height: 1.65;
}
.pm-kicker {
  margin: 0;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.pm-badge-row,
.pm-page-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.pm-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--pm-line);
  background: var(--pm-panel-soft);
  color: var(--pm-muted);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.pm-badge-accent {
  border-color: #b6e3ff;
  background: var(--pm-accent-soft);
  color: var(--pm-accent-strong);
}
.pm-tab-row {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  border-top: 1px solid var(--pm-line);
  padding-top: 12px;
}
.pm-tab-link {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  text-decoration: none;
  color: var(--pm-muted);
  font-size: 0.9rem;
  font-weight: 700;
  border-bottom: 2px solid transparent;
}
.pm-tab-link:hover {
  color: var(--pm-text);
  border-bottom-color: var(--pm-line-strong);
}
.pm-tab-link.is-active {
  color: var(--pm-text);
  border-bottom-color: var(--pm-accent);
}
.pm-section-title {
  margin: 0;
  color: var(--pm-muted);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.pm-card-head,
.pm-actions,
.pm-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.pm-toolbar { justify-content: flex-start; }
.pm-actions-end { justify-content: flex-end; }
.pm-grid { display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.pm-column-grid { display: grid; gap: 16px; grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr); }
.pm-stat-row { display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.pm-stat-card {
  border: 1px solid var(--pm-line);
  border-radius: 8px;
  background: var(--pm-panel-soft);
  padding: 14px;
  display: grid;
  gap: 6px;
}
.pm-stat-card strong {
  font-size: 0.95rem;
  overflow-wrap: anywhere;
}
.pm-stat-card small {
  color: var(--pm-muted);
  font-size: 0.77rem;
}
`;
