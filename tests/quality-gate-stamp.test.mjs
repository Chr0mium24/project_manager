import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readGateStatus, validateGateStatus, writeGateStatus } from '../scripts/lib/quality-gate-status.mjs';

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function createRepo() {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), 'gate-status-'));
  mkdirSync(path.join(rootDir, 'tmp'), { recursive: true });
  writeFileSync(path.join(rootDir, '.gitignore'), 'tmp/\n');
  writeFileSync(path.join(rootDir, 'tracked.txt'), 'baseline\n');

  run('git', ['init'], rootDir);
  run('git', ['config', 'user.name', 'Codex Test'], rootDir);
  run('git', ['config', 'user.email', 'codex@example.com'], rootDir);
  run('git', ['add', '.'], rootDir);
  run('git', ['commit', '-m', 'init'], rootDir);
  run('git', ['switch', '-c', 'task/test-gate'], rootDir);

  return rootDir;
}

test('quality gate status validates unchanged task branch worktree', () => {
  const rootDir = createRepo();
  const written = writeGateStatus(rootDir, ['lint', 'test:unit']);
  const readBack = readGateStatus(rootDir);
  const result = validateGateStatus(rootDir, readBack);

  assert.equal(written.branch, 'task/test-gate');
  assert.equal(result.ok, true);
});

test('quality gate status fails when worktree changed after gate', () => {
  const rootDir = createRepo();
  writeGateStatus(rootDir, ['lint', 'test:unit']);
  writeFileSync(path.join(rootDir, 'tracked.txt'), 'changed\n');

  const result = validateGateStatus(rootDir, readGateStatus(rootDir));
  assert.equal(result.ok, false);
  assert.match(result.reason, /worktree changed/);
});
