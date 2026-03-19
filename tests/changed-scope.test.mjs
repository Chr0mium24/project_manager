import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyChangedPaths,
  parseChangedPaths,
  validateChangedScope
} from "../scripts/lib/changed-scope.mjs";

test("parseChangedPaths handles modified, added, and renamed paths", () => {
  const paths = parseChangedPaths([
    " M package.json",
    "A  scripts/check-eslint.mjs",
    "R  old.ts -> packages/project-core/src/index.ts"
  ].join("\n"));

  assert.deepEqual(paths, [
    "package.json",
    "packages/project-core/src/index.ts",
    "scripts/check-eslint.mjs"
  ]);
});

test("validateChangedScope accepts one frontend, one backend, and one package", () => {
  const summary = classifyChangedPaths([
    "apps/web/src/index.ts",
    "apps/gateway/src/index.ts",
    "packages/project-core/src/index.ts",
    "docs/quality-gate.md"
  ]);

  assert.deepEqual(validateChangedScope(summary), []);
});

test("validateChangedScope rejects too many backend modules", () => {
  const summary = classifyChangedPaths([
    "apps/gateway/src/index.ts",
    "apps/ai-worker/src/index.ts"
  ]);

  assert.deepEqual(validateChangedScope(summary), [
    "changed backend modules exceed limit: ai-worker, gateway"
  ]);
});

test("validateChangedScope rejects too many shared packages", () => {
  const summary = classifyChangedPaths([
    "packages/project-core/src/index.ts",
    "packages/contracts/src/index.ts"
  ]);

  assert.deepEqual(validateChangedScope(summary), [
    "changed shared packages exceed limit: contracts, project-core"
  ]);
});
