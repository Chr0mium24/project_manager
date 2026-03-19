import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateContentRepo } from "../lib/validators.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, "../content-repo");
const result = validateContentRepo(rootDir);

console.log(`content-repo validation passed for ${result.projects} project(s)`);
