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
  assert.match(html, /data-project-manager-app/);
  assert.match(html, /\/assets\/platform-ui\.js/);
});

void test("readPlatformAsset returns the platform ui module asset", () => {
  const asset = readPlatformAsset("/assets/platform-ui.js");
  const shellAsset = readPlatformAsset("/assets/platform-ui/app/project-manager-shell.js");
  const vueAsset = readPlatformAsset("/assets/platform-ui/vendor/vue.js");

  assert.notEqual(asset, null);
  if (asset === null) {
    throw new Error("expected platform ui asset");
  }
  assert.notEqual(shellAsset, null);
  assert.notEqual(vueAsset, null);
  assert.equal(asset.contentType, "text/javascript; charset=utf-8");
  assert.match(asset.body, /createProjectManagerApp/);
  assert.match(asset.body, /\/assets\/platform-ui\/app\/project-manager-shell\.js/);
  assert.match(shellAsset?.body ?? "", /PROJECT_MANAGER_SHELL_STYLES/);
  assert.match(shellAsset?.body ?? "", /\/assets\/platform-ui\/vendor\/vue\.js/);
  assert.match(vueAsset?.body ?? "", /defineComponent/);
  assert.equal(readPlatformAsset("/assets/missing.js"), null);
});
