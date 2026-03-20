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
  assert.match(html, /Focused Route/);
  assert.match(html, /Project Workspace/);
  assert.match(html, /Project Versions/);
  assert.match(html, /data-section-nav/);
  assert.match(html, /data-overview-panel/);
  assert.match(html, /data-ai-compose-toggle/);
  assert.match(html, /data-ai-compose-body/);
  assert.match(html, /data-file-tree/);
  assert.match(html, /data-file-preview/);
  assert.match(html, /data-version-list/);
  assert.match(html, /data-version-diff/);
  assert.match(html, /window\.__PROJECT_MANAGER_PLATFORM__/);
  assert.match(html, /\/assets\/platform-ui\.js/);
  assert.match(html, /\/projects\/landing-a/);
});

void test("readPlatformAsset returns the platform ui module asset", () => {
  const asset = readPlatformAsset("/assets/platform-ui.js");

  assert.notEqual(asset, null);
  if (asset === null) {
    throw new Error("expected platform ui asset");
  }
  assert.equal(asset.contentType, "text/javascript; charset=utf-8");
  assert.match(asset.body, /requestJson/);
  assert.match(asset.body, /\/api\/projects\/\$\{state\.selectedProject\.slug\}\/file-tree/);
  assert.match(asset.body, /\/api\/projects\/\$\{state\.selectedProject\.slug\}\/versions/);
  assert.match(asset.body, /data-file-path/);
  assert.match(asset.body, /data-version-id/);
  assert.match(asset.body, /renderFocusedView/);
  assert.match(asset.body, /buildProjectPath/);
  assert.match(asset.body, /renderAiComposer/);
  assert.match(asset.body, /method: 'PUT'/);
  assert.match(asset.body, /data-restore-version/);
  assert.match(asset.body, /data-save-file/);
  assert.equal(readPlatformAsset("/assets/missing.js"), null);
});
