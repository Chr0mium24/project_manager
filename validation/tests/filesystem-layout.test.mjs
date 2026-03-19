import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateContentRepo } from "../lib/validators.mjs";

test("validates the example content-repo fixture", () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(currentDir, "../content-repo");
  const result = validateContentRepo(rootDir);

  assert.equal(result.projects, 2);
});
