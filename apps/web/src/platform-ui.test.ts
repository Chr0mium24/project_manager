import assert from "node:assert/strict";
import test from "node:test";
import {
  readPlatformAsset,
  renderPlatformDocument
} from "./platform-ui.ts";

void test("renderPlatformDocument returns a platform shell with the boot asset", () => {
  const html = renderPlatformDocument({
    pathname: "/projects/landing-a"
  });

  assert.match(html, /Project Manager Control Plane/);
  assert.match(html, /Project Workspace/);
  assert.match(html, /data-file-tree/);
  assert.match(html, /data-file-preview/);
  assert.match(html, /window\.__PROJECT_MANAGER_PLATFORM__/);
  assert.match(html, /\/assets\/platform-ui\.js/);
  assert.match(html, /\/projects\/landing-a/);
});

void test("readPlatformAsset returns the platform ui module asset", () => {
  const asset = readPlatformAsset("/assets/platform-ui.js");

  assert.notEqual(asset, null);
  assert.equal(asset.contentType, "text/javascript; charset=utf-8");
  assert.match(asset.body, /requestJson/);
  assert.match(asset.body, /\/api\/projects\/\$\{state\.selectedProject\.slug\}\/file-tree/);
  assert.match(asset.body, /data-file-path/);
  assert.equal(readPlatformAsset("/assets/missing.js"), null);
});
