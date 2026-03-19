import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { isExecutable } from './lib/fs-utils.mjs';

const rootDir = process.cwd();
const requiredFiles = [
  'package.json',
  'pnpm-workspace.yaml',
  'turbo.json',
  'tsconfig.base.json',
  'eslint.config.mjs',
  '.prettierrc.json',
  '.dependency-cruiser.cjs',
  'CODEX.md',
  'docs/README.md',
];

const missing = requiredFiles.filter((file) => !existsSync(path.join(rootDir, file)));

if (missing.length > 0) {
  console.error('[config] missing required files:');
  missing.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log('[config] required files present');

const requiredExecutables = [
  'scripts/run-quality-gate.sh',
  'scripts/register-dev-route.sh',
  'scripts/codex-safe-git.sh',
  'scripts/codex-start-task.sh',
  'scripts/codex-safe-gh.sh',
];

const nonExecutable = requiredExecutables.filter((file) => !isExecutable(path.join(rootDir, file)));
if (nonExecutable.length > 0) {
  console.error('[config] scripts must be executable:');
  nonExecutable.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log('[config] executable script entrypoints present');
