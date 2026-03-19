import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export function runGit(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    const stderr = result.stderr?.trim() || 'git command failed';
    throw new Error(stderr);
  }

  return result.stdout.trim();
}

export function getCurrentBranch(cwd) {
  return runGit(['branch', '--show-current'], cwd);
}

export function getHeadSha(cwd) {
  return runGit(['rev-parse', 'HEAD'], cwd);
}

export function getWorktreeStatus(cwd) {
  return runGit(['status', '--porcelain=v1', '--untracked-files=all'], cwd);
}

export function getWorktreeFingerprint(cwd) {
  const digest = createHash('sha256');
  digest.update(getWorktreeStatus(cwd));
  return digest.digest('hex');
}
