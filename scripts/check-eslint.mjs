import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { walkFiles } from "./lib/fs-utils.mjs";

const SOURCE_ROOTS = ["apps", "packages", "scripts", "tests"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs"]);
const HEARTBEAT_INTERVAL_MS = 15_000;

function collectSourceFiles(rootDir) {
  return SOURCE_ROOTS.flatMap((sourceRoot) => {
    const sourcePath = path.join(rootDir, sourceRoot);
    if (!existsSync(sourcePath)) {
      return [];
    }
    return walkFiles(sourcePath, {
      includeExtensions: SOURCE_EXTENSIONS
    }).map((filePath) => path.relative(rootDir, filePath));
  }).sort();
}

function summarizeRoots(files) {
  return SOURCE_ROOTS.map((sourceRoot) => {
    const count = files.filter((filePath) => filePath === sourceRoot || filePath.startsWith(`${sourceRoot}${path.sep}`)).length;
    return `${sourceRoot}=${count}`;
  }).join(", ");
}

function formatDuration(durationMs) {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${remainingSeconds}s`;
}

function runEslint(eslintBin, files, cacheLocation) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(
      eslintBin,
      [
        ...files,
        "--cache",
        "--cache-location",
        cacheLocation,
        "--max-warnings",
        "0"
      ],
      {
        cwd: process.cwd(),
        stdio: "inherit"
      }
    );

    const heartbeat = setInterval(() => {
      console.log(`[eslint] still running after ${formatDuration(Date.now() - startedAt)}`);
    }, HEARTBEAT_INTERVAL_MS);

    child.on("error", (error) => {
      clearInterval(heartbeat);
      reject(error);
    });

    child.on("exit", (code, signal) => {
      clearInterval(heartbeat);
      if (signal !== null) {
        console.error(`[eslint] terminated by signal ${signal} after ${formatDuration(Date.now() - startedAt)}`);
        resolve(1);
        return;
      }

      console.log(`[eslint] finished in ${formatDuration(Date.now() - startedAt)}`);
      resolve(code ?? 1);
    });
  });
}

async function main() {
  const rootDir = process.cwd();
  const eslintBin = path.join(rootDir, "node_modules", ".bin", "eslint");
  const cacheDirectory = path.join(rootDir, "tmp");
  const cacheLocation = path.join(cacheDirectory, "eslint-cache");

  mkdirSync(cacheDirectory, { recursive: true });

  const files = collectSourceFiles(rootDir);
  if (files.length === 0) {
    console.log("[eslint] no source files matched the lint target set");
    return;
  }

  console.log(`[eslint] linting ${files.length} source files (${summarizeRoots(files)})`);
  console.log(`[eslint] cache location: ${path.relative(rootDir, cacheLocation)}`);

  try {
    const status = await runEslint(eslintBin, files, cacheLocation);
    process.exit(status);
  } catch (error) {
    console.error("[eslint] failed to launch eslint");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

await main();
