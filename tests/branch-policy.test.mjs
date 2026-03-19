import test from 'node:test';
import assert from 'node:assert/strict';
import { getCanonicalTaskBranch, validateCommitBranch } from '../scripts/lib/branch-policy.mjs';

test('canonical task branch name uses task/<slug>', () => {
  assert.equal(getCanonicalTaskBranch('fix-preview-cache'), 'task/fix-preview-cache');
});

test('commit branch validation rejects mainline branches', () => {
  const result = validateCommitBranch('main');
  assert.equal(result.ok, false);
  assert.match(result.reason, /mainline/);
});

test('commit branch validation rejects non-task branches', () => {
  const result = validateCommitBranch('feature/demo');
  assert.equal(result.ok, false);
  assert.match(result.reason, /task\/<slug>/);
});

test('commit branch validation accepts task branches', () => {
  const result = validateCommitBranch('task/demo-workflow');
  assert.equal(result.ok, true);
});
