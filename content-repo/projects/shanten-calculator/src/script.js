const bundleStore = window.__PROJECT_MANAGER_SCRIPT_BUNDLES__ || {};
const bundleSource = bundleStore["shanten-calculator:script.js"] || "";
if (bundleSource) {
  window.eval(bundleSource);
  delete bundleStore["shanten-calculator:script.js"];
}
