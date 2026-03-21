export const PROJECT_MANAGER_SHELL_COMPONENT_STYLES = `
.pm-directory-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.pm-directory-card {
  display: grid;
  gap: 12px;
  text-decoration: none;
  color: var(--pm-text);
  border: 1px solid var(--pm-line);
  border-radius: 12px;
  background: var(--pm-panel);
  padding: 18px;
  transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
}
.pm-directory-card:hover {
  border-color: var(--pm-accent);
  box-shadow: 0 8px 24px rgba(9, 105, 218, 0.08);
  transform: translateY(-1px);
}
.pm-project-list,
.pm-list,
.pm-tree-list,
.pm-focus-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}
.pm-project-row,
.pm-focus-item {
  border: 1px solid var(--pm-line);
  border-radius: 10px;
  background: var(--pm-panel);
  padding: 16px;
}
.pm-project-row {
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}
.pm-project-title-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.pm-project-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
}
.pm-project-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}
.pm-project-actions {
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  align-items: center;
  justify-content: end;
}
.pm-project-link,
.pm-plain-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 0.86rem;
  font-weight: 700;
  border: 1px solid var(--pm-line);
  background: var(--pm-panel);
  color: var(--pm-text);
}
.pm-project-link:hover,
.pm-plain-link:hover {
  border-color: var(--pm-line-strong);
  background: var(--pm-panel-soft);
}
.pm-project-link-primary {
  border-color: var(--pm-accent);
  background: var(--pm-accent);
  color: #ffffff;
}
.pm-project-link-primary:hover {
  border-color: var(--pm-accent-strong);
  background: var(--pm-accent-strong);
}
.pm-meta-list {
  margin: 0;
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 10px 16px;
}
.pm-meta-list dt {
  color: var(--pm-muted);
  font-size: 0.79rem;
  font-weight: 800;
}
.pm-meta-list dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.pm-field,
.pm-field-full {
  display: grid;
  gap: 6px;
}
.pm-field-grow {
  flex: 1 1 320px;
  min-width: min(320px, 100%);
}
.pm-field span,
.pm-field-full span {
  color: var(--pm-muted);
  font-size: 0.77rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.pm-form-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.pm-field-full { grid-column: 1 / -1; }
.pm-input,
.pm-textarea {
  width: 100%;
  border: 1px solid var(--pm-line);
  border-radius: 8px;
  background: var(--pm-panel);
  color: var(--pm-text);
  padding: 10px 12px;
  outline: none;
}
.pm-input:focus,
.pm-textarea:focus {
  border-color: var(--pm-accent);
  box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.12);
}
.pm-textarea {
  min-height: 180px;
  resize: vertical;
}
.pm-button {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid #1f883d;
  border-radius: 8px;
  background: #1f883d;
  color: #ffffff;
  font-size: 0.86rem;
  font-weight: 700;
}
.pm-button:hover { background: #1a7f37; }
.pm-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.pm-button-ghost {
  border-color: var(--pm-line);
  background: var(--pm-panel);
  color: var(--pm-text);
}
.pm-button-ghost:hover { background: var(--pm-panel-soft); }
.pm-list-button,
.pm-tree-button {
  width: 100%;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--pm-line);
  border-radius: 8px;
  background: var(--pm-panel);
  padding: 10px 12px;
  text-align: left;
}
.pm-list-button:hover,
.pm-tree-button:hover {
  background: var(--pm-panel-soft);
}
.pm-list-button.is-active,
.pm-tree-button.is-active {
  border-color: #b6e3ff;
  background: var(--pm-accent-soft);
}
.pm-tree-dir {
  color: var(--pm-muted);
  font-size: 0.78rem;
  font-weight: 800;
  padding: 2px 2px 0;
  text-transform: uppercase;
}
.pm-workspace-card,
.pm-workspace-grid,
.pm-version-grid {
  display: grid;
  gap: 16px;
}
.pm-workspace-grid,
.pm-version-grid {
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
}
.pm-workspace-grid.is-focused { grid-template-columns: minmax(0, 1fr); }
.pm-editor-shell,
.pm-subcard {
  border: 1px solid var(--pm-line);
  border-radius: 10px;
  background: var(--pm-panel);
  padding: 16px;
}
.pm-editor {
  min-height: 480px;
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.84rem;
  line-height: 1.6;
}
.pm-ace-editor-host,
.pm-ace-editor-fallback {
  border: 1px solid var(--pm-line);
  border-radius: 8px;
  background: var(--pm-panel);
}
.pm-ace-editor-host {
  overflow: hidden;
}
.pm-ace-editor-fallback {
  padding: 16px;
  color: var(--pm-danger);
}
.pm-inline-note,
.pm-muted-block {
  margin: 0;
  color: var(--pm-muted);
}
.pm-error { color: var(--pm-danger); }
.pm-code-list {
  display: grid;
  gap: 8px;
}
.pm-code-list code {
  display: inline-block;
  border: 1px solid var(--pm-line);
  border-radius: 6px;
  background: var(--pm-panel-soft);
  padding: 2px 6px;
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.8rem;
}
.pm-log-block {
  border: 1px solid var(--pm-line);
  border-radius: 8px;
  background: var(--pm-panel-soft);
}
.pm-log-summary {
  cursor: pointer;
  list-style: none;
  padding: 10px 12px;
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--pm-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.pm-log-pre {
  margin: 0;
  padding: 0 12px 12px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.78rem;
  line-height: 1.55;
  color: var(--pm-text);
}
@media (max-width: 1040px) {
  .pm-directory-grid,
  .pm-column-grid,
  .pm-grid,
  .pm-workspace-grid,
  .pm-version-grid,
  .pm-form-grid,
  .pm-project-row {
    grid-template-columns: 1fr;
  }
  .pm-project-actions { justify-content: start; grid-auto-flow: row; grid-auto-columns: 1fr; }
}
`;
