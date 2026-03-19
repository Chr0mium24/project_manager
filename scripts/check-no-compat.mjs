import path from 'node:path';
import process from 'node:process';
import { readText, walkFiles } from './lib/fs-utils.mjs';

const rootDir = process.cwd();
const includeExtensions = new Set(['.js', '.mjs', '.ts', '.tsx', '.sh']);
const files = walkFiles(rootDir, { includeExtensions });
const ignoredPaths = new Set([
  'eslint.config.mjs',
  'scripts/check-no-compat.mjs',
]);
const bannedPatterns = [
  { pattern: /\bmodule\.exports\b/, reason: 'CommonJS compatibility exports are forbidden. Use ESM only.' },
  { pattern: /\bexports\./, reason: 'CommonJS compatibility exports are forbidden. Use ESM only.' },
  { pattern: /\brequire\(/, reason: 'require() compatibility branches are forbidden. Use import syntax.' },
  { pattern: /\b__dirname\b/, reason: '__dirname compatibility code is forbidden. Use import.meta.url-based APIs.' },
  { pattern: /\b__filename\b/, reason: '__filename compatibility code is forbidden. Use import.meta.url-based APIs.' },
  { pattern: /\bBun\b/, reason: 'Bun-specific runtime branches are forbidden in V1.' },
  { pattern: /\bDeno\b/, reason: 'Deno-specific runtime branches are forbidden in V1.' },
  { pattern: /process\.versions\.node/, reason: 'Runtime version branching is forbidden. Target the pinned Node version exactly.' },
  { pattern: /npm_config_user_agent/, reason: 'Package-manager compatibility branching is forbidden. Use pnpm only.' },
  { pattern: /node-fetch/, reason: 'Legacy fetch compatibility paths are forbidden. Use built-in fetch on the pinned runtime.' },
];

const failures = [];

for (const filePath of files) {
  const relativePath = path.relative(rootDir, filePath);
  if (ignoredPaths.has(relativePath)) {
    continue;
  }
  const content = readText(filePath);
  bannedPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(content)) {
      failures.push(`${relativePath}: ${reason}`);
    }
  });
}

if (failures.length > 0) {
  console.error('[no-compat] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`[no-compat] ok (${files.length} files checked)`);
