import { rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";

export const CLEAN_TARGETS = Object.freeze({
  "web-dist": "apps/web/dist",
  cache: ".cache",
  tmp: "tmp"
});

function normalizeTargets(targetNames) {
  if (targetNames.length === 0) {
    return ["web-dist"];
  }

  if (targetNames.includes("all")) {
    return Object.keys(CLEAN_TARGETS);
  }

  return targetNames;
}

function resolveTargetPath(rootDir, relativePath) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  const allowedPrefix = `${resolvedRoot}${path.sep}`;

  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(allowedPrefix)) {
    throw new Error(`refusing to clean path outside repository: ${relativePath}`);
  }

  return resolvedPath;
}

export function cleanGenerated(rootDir, requestedTargets) {
  const targetNames = normalizeTargets(requestedTargets);

  for (const targetName of targetNames) {
    const relativePath = CLEAN_TARGETS[targetName];
    if (!relativePath) {
      throw new Error(`unknown clean target: ${targetName}`);
    }

    const targetPath = resolveTargetPath(rootDir, relativePath);
    rmSync(targetPath, { force: true, recursive: true });
  }

  return targetNames;
}

function main() {
  try {
    const cleanedTargets = cleanGenerated(process.cwd(), process.argv.slice(2));
    cleanedTargets.forEach((targetName) => {
      const relativePath = CLEAN_TARGETS[targetName];
      console.log(`[clean-generated] ${targetName} -> ${relativePath}`);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown clean error";
    console.error(`[clean-generated] ${message}`);
    process.exit(1);
  }
}

if (import.meta.url === new URL(process.argv[1], "file://").href) {
  main();
}
