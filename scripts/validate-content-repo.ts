import process from "node:process";
import { getContentRepoRoot, validateContentRepo } from "../packages/project-core/src/index.ts";

const rootDir = process.cwd();
const summary = validateContentRepo(getContentRepoRoot(rootDir));

console.log(JSON.stringify({
  status: "ok",
  contentRepo: getContentRepoRoot(rootDir),
  projects: summary.projects
}, null, 2));
