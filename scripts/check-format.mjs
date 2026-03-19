import path from 'node:path';
import process from 'node:process';
import { readText, walkFiles } from './lib/fs-utils.mjs';

const rootDir = process.cwd();
const includeExtensions = new Set(['.md', '.mjs', '.js', '.json', '.sh', '.ts', '.tsx', '.yaml', '.yml']);
const files = walkFiles(rootDir, { includeExtensions });
const failures = [];

for (const filePath of files) {
  const content = readText(filePath);
  if (content.length > 0 && !content.endsWith('\n')) {
    failures.push(`${path.relative(rootDir, filePath)}: missing trailing newline`);
  }

  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (/\s+$/.test(line)) {
      failures.push(`${path.relative(rootDir, filePath)}:${index + 1}: trailing whitespace`);
    }
  });
}

if (failures.length > 0) {
  console.error('[format:check] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`[format:check] ok (${files.length} files checked)`);
