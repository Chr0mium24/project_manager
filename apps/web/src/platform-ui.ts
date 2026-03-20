import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export interface PlatformAsset {
  body: string;
  contentType: string;
}

export interface PlatformDocumentInput {
  pathname: string;
}

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(CURRENT_DIR, "..", "..", "..");
const WEB_SRC_ROOT = CURRENT_DIR;
const PNPM_ROOT = path.join(REPO_ROOT, "node_modules", ".pnpm");
const ENTRY_ASSET_PATH = "/assets/platform-ui.js";
const MODULE_ASSET_PREFIX = "/assets/platform-ui/";

const vendorAssets = {
  [`${MODULE_ASSET_PREFIX}vendor/vue.js`]: resolvePnpmAsset(
    "vue",
    "dist/vue.runtime.esm-browser.prod.js"
  ),
  [`${MODULE_ASSET_PREFIX}vendor/vue-router.js`]: resolvePnpmAsset(
    "vue-router",
    "dist/vue-router.esm-browser.prod.js"
  ),
  [`${MODULE_ASSET_PREFIX}vendor/pinia.js`]: resolvePnpmAsset(
    "pinia",
    "dist/pinia.esm-browser.js"
  )
} as const;

function resolvePnpmAsset(packageName: string, relativePath: string): string {
  const packagePrefix = `${packageName.replaceAll("/", "+")}@`;
  const packageDir = fs.readdirSync(PNPM_ROOT)
    .sort()
    .find((entry) => entry.startsWith(packagePrefix));
  if (!packageDir) {
    throw new Error(`browser package asset not found: ${packageName}`);
  }

  return path.join(PNPM_ROOT, packageDir, "node_modules", packageName, relativePath);
}

function sourcePathToAssetPath(sourcePath: string): string {
  const relativePath = path.relative(WEB_SRC_ROOT, sourcePath);
  if (relativePath === "main.ts") {
    return ENTRY_ASSET_PATH;
  }
  return `${MODULE_ASSET_PREFIX}${relativePath.replace(/\.ts$/, ".js")}`;
}

function assetPathToSourcePath(pathname: string): string | null {
  if (pathname === ENTRY_ASSET_PATH) {
    return path.join(WEB_SRC_ROOT, "main.ts");
  }

  if (!pathname.startsWith(MODULE_ASSET_PREFIX) || pathname.includes("/vendor/") || !pathname.endsWith(".js")) {
    return null;
  }

  const relativePath = pathname.slice(MODULE_ASSET_PREFIX.length).replace(/\.js$/, ".ts");
  const resolvedPath = path.resolve(WEB_SRC_ROOT, relativePath);
  if (!resolvedPath.startsWith(WEB_SRC_ROOT) || !fs.existsSync(resolvedPath)) {
    return null;
  }

  return resolvedPath;
}

function resolveRelativeSourcePath(sourcePath: string, specifier: string): string {
  const resolvedPath = path.resolve(path.dirname(sourcePath), specifier);
  if (path.extname(resolvedPath).length > 0) {
    return resolvedPath;
  }
  return `${resolvedPath}.ts`;
}

function rewriteSpecifier(sourcePath: string, specifier: string): string {
  if (specifier === "vue") {
    return `${MODULE_ASSET_PREFIX}vendor/vue.js`;
  }
  if (specifier === "vue-router") {
    return `${MODULE_ASSET_PREFIX}vendor/vue-router.js`;
  }
  if (specifier === "pinia") {
    return `${MODULE_ASSET_PREFIX}vendor/pinia.js`;
  }
  if (specifier.startsWith(".")) {
    return sourcePathToAssetPath(resolveRelativeSourcePath(sourcePath, specifier));
  }
  return specifier;
}

function rewriteImports(code: string, sourcePath: string): string {
  return code
    .replace(/from\s+["']([^"']+)["']/g, (_match, specifier: string) =>
      `from "${rewriteSpecifier(sourcePath, specifier)}"`
    )
    .replace(/import\(\s*["']([^"']+)["']\s*\)/g, (_match, specifier: string) =>
      `import("${rewriteSpecifier(sourcePath, specifier)}")`
    );
}

function transpileSourceAsset(sourcePath: string): string {
  const rawSource = fs.readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(rawSource, {
    fileName: sourcePath,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true
    }
  }).outputText;
  return rewriteImports(transpiled, sourcePath);
}

function readVendorAsset(pathname: keyof typeof vendorAssets): PlatformAsset {
  const body = rewriteImports(fs.readFileSync(vendorAssets[pathname], "utf8"), vendorAssets[pathname]);
  return {
    body,
    contentType: "text/javascript; charset=utf-8"
  };
}

export function renderPlatformDocument(_input: PlatformDocumentInput): string {
  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "  <meta charset=\"utf-8\">",
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">",
    "  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>",
    "  <link href=\"https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap\" rel=\"stylesheet\">",
    "  <title>Project Manager Control Plane</title>",
    "</head>",
    "<body>",
    "  <div data-project-manager-app></div>",
    `  <script type="module" src="${ENTRY_ASSET_PATH}"></script>`,
    "</body>",
    "</html>"
  ].join("\n");
}

export function readPlatformAsset(pathname: string): PlatformAsset | null {
  if (pathname in vendorAssets) {
    return readVendorAsset(pathname as keyof typeof vendorAssets);
  }

  const sourcePath = assetPathToSourcePath(pathname);
  if (sourcePath === null) {
    return null;
  }

  return {
    body: transpileSourceAsset(sourcePath),
    contentType: "text/javascript; charset=utf-8"
  };
}
