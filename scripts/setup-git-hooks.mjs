import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const expectedHooksPath = '.githooks';

function isGitRepository(cwd) {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

if (!isGitRepository(rootDir)) {
  console.log('[hooks] skipped: current directory is not a Git worktree');
  process.exit(0);
}

const topLevel = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: rootDir,
  encoding: 'utf8',
}).trim();

if (path.resolve(topLevel) !== path.resolve(rootDir)) {
  console.log(`[hooks] skipped: run from repository root (${topLevel})`);
  process.exit(0);
}

let currentHooksPath = '';
try {
  currentHooksPath = execFileSync('git', ['config', '--get', 'core.hooksPath'], {
    cwd: rootDir,
    encoding: 'utf8',
  }).trim();
} catch {
  currentHooksPath = '';
}

if (currentHooksPath === expectedHooksPath) {
  console.log(`[hooks] core.hooksPath already set to ${expectedHooksPath}`);
  process.exit(0);
}

try {
  execFileSync('git', ['config', 'core.hooksPath', expectedHooksPath], {
    cwd: rootDir,
    stdio: 'ignore',
  });
  console.log(`[hooks] core.hooksPath -> ${expectedHooksPath}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[hooks] skipped: unable to configure core.hooksPath (${message})`);
  process.exit(0);
}
