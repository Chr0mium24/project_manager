const bundleStore = window.__PROJECT_MANAGER_SCRIPT_BUNDLES__ || {};
const bundleSource = bundleStore["experiment-image-packer:script.js"] || "";
if (bundleSource) {
  window.eval(bundleSource);
  delete bundleStore["experiment-image-packer:script.js"];
}
