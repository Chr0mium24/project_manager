import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('codex safe gh helper rejects PR operations', () => {
  const result = spawnSync('./scripts/codex-safe-gh.sh', ['pr', 'create'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /forbidden/i);
});
