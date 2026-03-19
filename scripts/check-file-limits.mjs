import path from 'node:path';
import process from 'node:process';
import { lineCount, walkFiles } from './lib/fs-utils.mjs';

const rootDir = process.cwd();
const includeExtensions = new Set(['.js', '.mjs', '.ts', '.tsx', '.sh']);
const files = walkFiles(rootDir, { includeExtensions });
const failures = [];

for (const filePath of files) {
  const relativePath = path.relative(rootDir, filePath);
  const lines = lineCount(filePath);
  const limit = relativePath.includes('scripts/lib/') ? 300 : 400;
  if (lines > limit) {
    failures.push(`${relativePath}: ${lines} lines exceeds limit ${limit}`);
  }
}

if (failures.length > 0) {
  console.error('[file-limits] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`[file-limits] ok (${files.length} files checked)`);
