import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

void test("web dev index uses an absolute module entry path", () => {
  const indexHtmlPath = path.resolve(import.meta.dirname, "..", "index.html");
  const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");

  assert.match(indexHtml, /<script type="module" src="\/src\/main\.ts"><\/script>/);
});
