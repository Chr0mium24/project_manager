import process from 'node:process';
import { getCanonicalTaskBranch } from './lib/branch-policy.mjs';
import { runGit } from './lib/git-utils.mjs';

const slug = process.argv[2];
if (!slug) {
  console.error('usage: node scripts/start-task-branch.mjs <slug>');
  process.exit(1);
}

const branchName = getCanonicalTaskBranch(slug);
const rootDir = process.cwd();
const existing = runGit(['branch', '--list', branchName], rootDir);

if (existing.length > 0) {
  runGit(['switch', branchName], rootDir);
  console.log(`[task-branch] switched to existing ${branchName}`);
} else {
  runGit(['switch', '-c', branchName], rootDir);
  console.log(`[task-branch] created ${branchName}`);
}
