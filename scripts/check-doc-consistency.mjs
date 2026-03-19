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
    file: 'validation/README.md',
    mustContain: 'validation-only',
    reason: 'validation workspace docs must be explicitly scoped',
  },
  {
    file: 'validation/CODEX.md',
    mustContain: 'validation-only',
    reason: 'validation Codex guide must be explicitly scoped',
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
