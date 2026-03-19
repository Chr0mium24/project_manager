import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const eslintBin = path.join(process.cwd(), "node_modules", ".bin", "eslint");
const result = spawnSync(
  eslintBin,
  [
    "apps",
    "packages",
    "scripts",
    "tests",
    "--max-warnings",
    "0",
    "--ext",
    ".ts,.tsx,.js,.mjs"
  ],
  {
    cwd: process.cwd(),
    stdio: "inherit"
  }
);

if (result.error) {
  console.error("[eslint] failed to launch eslint");
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
