import assert from "node:assert/strict";
import test from "node:test";
import {
  readPlatformAsset,
  renderPlatformDocument
} from "./platform-ui.ts";

function expectAsset(pathname: string) {
  const asset = readPlatformAsset(pathname);
  assert.notEqual(asset, null);
  if (asset === null) {
    throw new Error(`expected platform asset: ${pathname}`);
  }
  return asset;
}

function assertPlatformAssetGraph() {
  const asset = expectAsset("/assets/platform-ui.js");
  const shellAsset = expectAsset("/assets/platform-ui/app/project-manager-shell.js");
  const vueAsset = expectAsset("/assets/platform-ui/vendor/vue.js");
  const piniaAsset = expectAsset("/assets/platform-ui/vendor/pinia.js");
  const devtoolsAsset = expectAsset("/assets/platform-ui/vendor/vue-devtools-api.js");
  const devtoolsEnvAsset = expectAsset("/assets/platform-ui/vendor-modules/@vue__devtools-api/lib/esm/env.js");

  assert.equal(asset.contentType, "text/javascript; charset=utf-8");
  assert.match(asset.body, /createProjectManagerApp/);
  assert.match(asset.body, /\/assets\/platform-ui\/app\/project-manager-shell\.js/);
  assert.match(shellAsset.body, /PROJECT_MANAGER_SHELL_STYLES/);
  assert.match(shellAsset.body, /\/assets\/platform-ui\/vendor\/vue\.js/);
  assert.match(vueAsset.body, /defineComponent/);
  assert.match(piniaAsset.body, /\/assets\/platform-ui\/vendor\/vue-devtools-api\.js/);
  assert.match(devtoolsAsset.body, /\/assets\/platform-ui\/vendor-modules\/@vue__devtools-api\/lib\/esm\/env\.js/);
  assert.match(devtoolsEnvAsset.body, /getDevtoolsGlobalHook/);
}

void test("renderPlatformDocument returns a platform shell with the boot asset", () => {
  const html = renderPlatformDocument({
    pathname: "/projects/landing-a"
  });

  assert.match(html, /Project Manager Control Plane/);
  assert.match(html, /data-project-manager-app/);
  assert.match(html, /\/assets\/platform-ui\.js/);
});

void test("readPlatformAsset returns the platform ui module asset", () => {
  assertPlatformAssetGraph();
  assert.equal(readPlatformAsset("/assets/missing.js"), null);
});
