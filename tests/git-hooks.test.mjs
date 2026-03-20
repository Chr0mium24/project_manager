import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

void test('repository wires tracked pre-commit hooks through package scripts', () => {
  const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts.prepare, 'node scripts/setup-git-hooks.mjs');
  assert.equal(packageJson.scripts['setup:hooks'], 'node scripts/setup-git-hooks.mjs');
});

void test('tracked pre-commit hook enforces the full quality gate', () => {
  const hookPath = path.join(rootDir, '.githooks', 'pre-commit');
  const hookSource = readFileSync(hookPath, 'utf8');
  const hookStat = statSync(hookPath);

  assert.ok((hookStat.mode & 0o111) !== 0, 'pre-commit hook must be executable');
  assert.match(hookSource, /git diff --quiet --ignore-submodules --/);
  assert.match(hookSource, /\.\/scripts\/run-quality-gate\.sh/);
});

void test('hook bootstrap script configures the tracked hooks path', () => {
  const scriptSource = readFileSync(path.join(rootDir, 'scripts', 'setup-git-hooks.mjs'), 'utf8');
  assert.match(scriptSource, /core\.hooksPath/);
  assert.match(scriptSource, /\.githooks/);
});
