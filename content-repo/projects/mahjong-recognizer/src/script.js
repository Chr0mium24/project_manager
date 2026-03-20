const bundleStore = window.__PROJECT_MANAGER_SCRIPT_BUNDLES__ || {};
const bundleSource = bundleStore["mahjong-recognizer:script.js"] || "";
if (bundleSource) {
  window.eval(bundleSource);
  delete bundleStore["mahjong-recognizer:script.js"];
}
