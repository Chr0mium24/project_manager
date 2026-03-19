import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const depcruiseBin = path.join(process.cwd(), "node_modules", ".bin", "depcruise");
const result = spawnSync(
  depcruiseBin,
  [
    "--config",
    ".dependency-cruiser.cjs",
    "apps",
    "packages",
    "scripts"
  ],
  {
    cwd: process.cwd(),
    stdio: "inherit"
  }
);

if (result.error) {
  console.error("[dependency-cruiser] failed to launch depcruise");
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
