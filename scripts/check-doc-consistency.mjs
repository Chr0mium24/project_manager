import { readText } from './lib/fs-utils.mjs';

const checks = [
  {
    file: 'docs/architecture-overview.md',
    mustNotContain: '/api/<slug>',
    reason: 'dynamic project routes must use /app/<slug> and /api/runtime/<slug>',
  },
  {
    file: 'PROJECT_ARCHITECTURE.md',
    mustContain: 'This file is historical context only.',
    reason: 'root architecture document must be clearly downgraded from source of truth',
  },
  {
    file: 'docs/codex-development.md',
    mustContain: 'main repository only',
    reason: 'main repository commit cadence must be explicitly scoped',
  },
  {
    file: 'docs/managed-project-codex-workflow.md',
    mustContain: 'does not define the commit cadence for the `project_manager` repository itself',
    reason: 'managed project workflow must be separated from main repo workflow',
  },
  {
    file: 'CODEX.md',
    mustContain: 'This file governs the `project_manager` repository itself.',
    reason: 'root Codex guide must identify its scope',
  },
];

const failures = [];

for (const check of checks) {
  const content = readText(check.file);
  if (check.mustContain && !content.includes(check.mustContain)) {
    failures.push(`${check.file}: missing required text: ${check.mustContain} (${check.reason})`);
  }

  if (check.mustNotContain && content.includes(check.mustNotContain)) {
    failures.push(`${check.file}: contains forbidden text: ${check.mustNotContain} (${check.reason})`);
  }
}

if (failures.length > 0) {
  console.error('[doc-consistency] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[doc-consistency] ok');
