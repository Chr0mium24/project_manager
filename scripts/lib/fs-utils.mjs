import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_IGNORES = new Set(['.git', 'node_modules', 'storage', 'tmp', '.cache', '.corepack']);

export function walkFiles(rootDir, options = {}) {
  const { includeExtensions = null, excludeDirectories = DEFAULT_IGNORES } = options;
  const results = [];
  visit(rootDir, results, includeExtensions, excludeDirectories);
  return results;
}

function visit(currentDir, results, includeExtensions, excludeDirectories) {
  const entries = readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (excludeDirectories.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      visit(fullPath, results, includeExtensions, excludeDirectories);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (includeExtensions && !includeExtensions.has(path.extname(entry.name))) {
      continue;
    }

    results.push(fullPath);
  }
}

export function readText(filePath) {
  return readFileSync(filePath, 'utf8');
}

export function lineCount(filePath) {
  const content = readText(filePath);
  return content === '' ? 0 : content.split('\n').length;
}

export function isExecutable(filePath) {
  return (statSync(filePath).mode & 0o111) !== 0;
}
