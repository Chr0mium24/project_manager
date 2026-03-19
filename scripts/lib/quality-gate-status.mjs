import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { validateCommitBranch } from './branch-policy.mjs';
import { getCurrentBranch, getHeadSha, getWorktreeFingerprint } from './git-utils.mjs';

export function getGateStatusPath(rootDir) {
  return path.join(rootDir, 'tmp', 'quality-gate-status.json');
}

export function writeGateStatus(rootDir, stages) {
  const payload = {
    status: 'passed',
    recordedAt: new Date().toISOString(),
    branch: getCurrentBranch(rootDir),
    headSha: getHeadSha(rootDir),
    worktreeFingerprint: getWorktreeFingerprint(rootDir),
    stages,
  };

  const filePath = getGateStatusPath(rootDir);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}

export function readGateStatus(rootDir) {
  const filePath = getGateStatusPath(rootDir);
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function validateGateStatus(rootDir, payload) {
  if (payload.status !== 'passed') {
    return { ok: false, reason: 'quality gate status is not passed' };
  }

  const branch = getCurrentBranch(rootDir);
  const branchCheck = validateCommitBranch(branch);
  if (!branchCheck.ok) {
    return branchCheck;
  }

  if (payload.branch !== branch) {
    return { ok: false, reason: 'quality gate branch does not match current branch' };
  }

  if (payload.headSha !== getHeadSha(rootDir)) {
    return { ok: false, reason: 'HEAD changed after the quality gate ran' };
  }

  if (payload.worktreeFingerprint !== getWorktreeFingerprint(rootDir)) {
    return { ok: false, reason: 'worktree changed after the quality gate ran' };
  }

  return { ok: true };
}
