import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { cleanGenerated } from "../scripts/clean-generated.mjs";

test("cleanGenerated removes only approved generated targets", () => {
  const rootDir = path.join(os.tmpdir(), `project-manager-clean-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const webDistDir = path.join(rootDir, "apps", "web", "dist");
  const sourceDir = path.join(rootDir, "apps", "web", "src");

  mkdirSync(webDistDir, { recursive: true });
  mkdirSync(sourceDir, { recursive: true });
  writeFileSync(path.join(webDistDir, "bundle.js"), "console.log('dist');\n");
  writeFileSync(path.join(sourceDir, "main.ts"), "export {};\n");

  const cleanedTargets = cleanGenerated(rootDir, ["web-dist"]);

  assert.deepEqual(cleanedTargets, ["web-dist"]);
  assert.equal(existsSync(webDistDir), false);
  assert.equal(existsSync(path.join(sourceDir, "main.ts")), true);
});

test("cleanGenerated rejects unknown targets", () => {
  const rootDir = path.join(os.tmpdir(), `project-manager-clean-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(rootDir, { recursive: true });

  assert.throws(() => cleanGenerated(rootDir, ["unknown-target"]), /unknown clean target/);
});
