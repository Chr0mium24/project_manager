const TASK_BRANCH_PATTERN = /^task\/[a-z0-9][a-z0-9-]*$/;
const MAINLINE_BRANCHES = new Set(['main', 'master']);

export function getCanonicalTaskBranch(slug) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error('task branch slug must be lowercase kebab-case');
  }

  return `task/${slug}`;
}

export function isMainlineBranch(branchName) {
  return MAINLINE_BRANCHES.has(branchName);
}

export function isAllowedTaskBranch(branchName) {
  return TASK_BRANCH_PATTERN.test(branchName);
}

export function validateCommitBranch(branchName) {
  if (isMainlineBranch(branchName)) {
    return {
      ok: false,
      reason: 'commits on mainline branches are blocked for Codex-safe Git',
    };
  }

  if (!isAllowedTaskBranch(branchName)) {
    return {
      ok: false,
      reason: 'Codex commits must happen on task/<slug> branches created by the task-branch helper',
    };
  }

  return { ok: true };
}
