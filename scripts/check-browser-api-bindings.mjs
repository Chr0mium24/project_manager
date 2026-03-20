import path from 'node:path';
import process from 'node:process';
import { readText, walkFiles } from './lib/fs-utils.mjs';

const rootDir = process.cwd();
const files = walkFiles(path.join(rootDir, 'apps', 'web', 'src'), {
  includeExtensions: new Set(['.ts', '.tsx']),
});

const bannedPatterns = [
  {
    pattern: /\?\?\s*fetch\b/,
    reason: 'Do not store the default browser fetch as an unbound method reference. Bind globalThis.fetch first.',
  },
  {
    pattern: /=\s*fetch\s*;/,
    reason: 'Do not assign the default browser fetch directly. Bind globalThis.fetch first.',
  },
];

const failures = [];

for (const filePath of files) {
  const relativePath = path.relative(rootDir, filePath);
  const content = readText(filePath);
  for (const { pattern, reason } of bannedPatterns) {
    if (pattern.test(content)) {
      failures.push(`${relativePath}: ${reason}`);
    }
  }
}

if (failures.length > 0) {
  console.error('[browser-api-bindings] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`[browser-api-bindings] ok (${files.length} files checked)`);
