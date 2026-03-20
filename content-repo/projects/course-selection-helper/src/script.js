const bundleStore = window.__PROJECT_MANAGER_SCRIPT_BUNDLES__ || {};
const bundleSource = bundleStore["course-selection-helper:script.js"] || "";
if (bundleSource) {
  window.eval(bundleSource);
  delete bundleStore["course-selection-helper:script.js"];
}
