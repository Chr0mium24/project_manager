export const PROJECT_MANAGER_SHELL_WORKFLOW_STYLES = `
.pm-shell-frame[aria-hidden="true"] {
  pointer-events: none;
  user-select: none;
}
.pm-topbar-note {
  margin: 0;
  color: var(--pm-muted);
  font-size: 0.8rem;
}
.pm-view-stack,
.pm-project-summary,
.pm-project-card-footer,
.pm-editor-head,
.pm-editor-file-copy,
.pm-review-panel,
.pm-review-groups,
.pm-session-overview,
.pm-session-stats,
.pm-task-turn-head {
  display: grid;
  gap: 12px;
}
.pm-project-facts {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
}
.pm-project-facts dt {
  color: var(--pm-muted);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.pm-project-facts dd {
  margin: 4px 0 0;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.pm-project-meta-link {
  color: var(--pm-accent-strong);
  text-decoration: none;
}
.pm-project-meta-link:hover {
  text-decoration: underline;
}
.pm-project-card-footer {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}
.pm-project-card-link {
  color: var(--pm-accent-strong);
  font-size: 0.84rem;
  font-weight: 700;
}
.pm-editor-head {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid var(--pm-line);
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff, var(--pm-panel-soft));
}
.pm-editor-file-path {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  overflow-wrap: anywhere;
}
.pm-review-note {
  padding: 14px 16px;
  border: 1px solid #f7c948;
  border-radius: 10px;
  background: #fff8db;
}
.pm-review-note .pm-section-title,
.pm-review-note .pm-copy {
  color: #7a5d00;
}
.pm-review-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pm-review-group {
  border: 1px solid var(--pm-line);
  border-radius: 10px;
  background: var(--pm-panel-soft);
  padding: 14px 16px;
}
.pm-review-group ul {
  margin-top: 12px;
}
.pm-selection-note {
  margin: 0;
  color: var(--pm-muted);
  font-size: 0.84rem;
}
.pm-checkbox {
  display: flex;
  align-items: start;
  gap: 10px;
  color: var(--pm-text);
  font-size: 0.9rem;
}
.pm-checkbox input {
  margin-top: 3px;
}
.pm-session-overview {
  padding: 16px;
  border: 1px solid var(--pm-line);
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff, var(--pm-panel-soft));
}
.pm-session-stats {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.pm-session-stat {
  padding: 12px;
  border: 1px solid var(--pm-line);
  border-radius: 10px;
  background: var(--pm-panel);
}
.pm-session-stat strong,
.pm-turn-title {
  display: block;
  font-size: 0.95rem;
  font-weight: 800;
}
.pm-session-stat span,
.pm-turn-preview {
  color: var(--pm-muted);
  font-size: 0.84rem;
}
.pm-task-turn {
  padding: 18px;
}
.pm-task-turn-head {
  gap: 8px;
}
.pm-task-section {
  display: grid;
  gap: 10px;
}
.pm-task-section > .pm-section-title {
  color: var(--pm-text);
}
@media (max-width: 1040px) {
  .pm-project-facts,
  .pm-editor-head,
  .pm-session-stats,
  .pm-project-card-footer {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 840px) {
  .pm-tab-row {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .pm-page-header-card {
    padding: 16px 18px 10px;
  }
}
`;
