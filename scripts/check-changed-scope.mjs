import { spawnSync } from "node:child_process";
import process from "node:process";
import {
  classifyChangedPaths,
  parseChangedPaths,
  validateChangedScope
} from "./lib/changed-scope.mjs";

const gitStatus = spawnSync("git", ["status", "--porcelain"], {
  cwd: process.cwd(),
  encoding: "utf8"
});

if (gitStatus.status !== 0) {
  console.error("[changed-scope] failed to inspect git status");
  process.exit(gitStatus.status ?? 1);
}

const changedPaths = parseChangedPaths(gitStatus.stdout);
if (changedPaths.length === 0) {
  console.log("[changed-scope] ok (clean worktree)");
  process.exit(0);
}

const summary = classifyChangedPaths(changedPaths);
const failures = validateChangedScope(summary);
if (failures.length > 0) {
  console.error("[changed-scope] failed");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `[changed-scope] ok (frontend=${summary.frontendApps.length}, backend=${summary.backendApps.length}, packages=${summary.sharedPackages.length})`
);
