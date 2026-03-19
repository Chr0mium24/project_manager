import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateModuleBoundaries } from "../scripts/lib/module-boundaries.mjs";

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
}

test("validateModuleBoundaries accepts package public entry imports", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-boundaries-"));
  writeFile(path.join(rootDir, "scripts", "task.ts"), 'import { x } from "../packages/core/src/index.ts";\n');
  writeFile(path.join(rootDir, "packages", "core", "src", "index.ts"), "export const x = 1;\n");

  assert.deepEqual(validateModuleBoundaries(rootDir), []);
});

test("validateModuleBoundaries rejects package imports from apps", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-boundaries-"));
  writeFile(path.join(rootDir, "packages", "core", "src", "index.ts"), 'import { x } from "../../../apps/web/src/index.ts";\nexport const y = x;\n');
  writeFile(path.join(rootDir, "apps", "web", "src", "index.ts"), "export const x = 1;\n");

  const failures = validateModuleBoundaries(rootDir);

  assert.equal(failures.length, 1);
  assert.match(failures[0] ?? "", /packages must not import apps/);
});

test("validateModuleBoundaries rejects cross-module private imports", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-boundaries-"));
  writeFile(path.join(rootDir, "apps", "gateway", "src", "index.ts"), 'import { x } from "../../../packages/core/src/internal.ts";\nvoid x;\n');
  writeFile(path.join(rootDir, "packages", "core", "src", "internal.ts"), "export const x = 1;\n");

  const failures = validateModuleBoundaries(rootDir);

  assert.equal(failures.length, 1);
  assert.match(failures[0] ?? "", /public entry/);
});
