import process from "node:process";
import { validateModuleBoundaries } from "./lib/module-boundaries.mjs";

const failures = validateModuleBoundaries(process.cwd());

if (failures.length > 0) {
  console.error("[architecture-imports] failed");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("[architecture-imports] ok");
