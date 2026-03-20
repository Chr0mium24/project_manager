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

interface VendorPackage {
  packageName: string;
  entryRelativePath: string;
  entryAssetPath: string;
}

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(CURRENT_DIR, "..", "..", "..");
const WEB_SRC_ROOT = CURRENT_DIR;
const PNPM_ROOT = path.join(REPO_ROOT, "node_modules", ".pnpm");
const ENTRY_ASSET_PATH = "/assets/platform-ui.js";
const MODULE_ASSET_PREFIX = "/assets/platform-ui/";
const VENDOR_MODULE_PREFIX = `${MODULE_ASSET_PREFIX}vendor-modules/`;

const vendorPackages: VendorPackage[] = [
  {
    packageName: "vue",
    entryRelativePath: "dist/vue.runtime.esm-browser.prod.js",
    entryAssetPath: `${MODULE_ASSET_PREFIX}vendor/vue.js`
  },
  {
    packageName: "vue-router",
    entryRelativePath: "dist/vue-router.esm-browser.prod.js",
    entryAssetPath: `${MODULE_ASSET_PREFIX}vendor/vue-router.js`
  },
  {
    packageName: "pinia",
    entryRelativePath: "dist/pinia.esm-browser.js",
    entryAssetPath: `${MODULE_ASSET_PREFIX}vendor/pinia.js`
  },
  {
    packageName: "@vue/devtools-api",
    entryRelativePath: "lib/esm/index.js",
    entryAssetPath: `${MODULE_ASSET_PREFIX}vendor/vue-devtools-api.js`
  }
];

const vendorPackageRoots = new Map(
  vendorPackages.map((vendorPackage) => [vendorPackage.packageName, resolvePnpmPackageRoot(vendorPackage.packageName)])
);
const vendorEntryAssets = new Map(
  vendorPackages.map((vendorPackage) => [
    vendorPackage.entryAssetPath,
    path.join(vendorPackageRoots.get(vendorPackage.packageName) ?? "", vendorPackage.entryRelativePath)
  ])
);
const vendorAssetSegments = new Map(
  vendorPackages.map((vendorPackage) => [packageNameToAssetSegment(vendorPackage.packageName), vendorPackage.packageName])
);

function packageNameToAssetSegment(packageName: string): string {
  return packageName.replaceAll("/", "__");
}

function resolvePnpmPackageRoot(packageName: string): string {
  const packagePrefix = `${packageName.replaceAll("/", "+")}@`;
  const packageDir = fs.readdirSync(PNPM_ROOT).sort().find((entry) => entry.startsWith(packagePrefix));
  if (!packageDir) {
    throw new Error(`browser package asset not found: ${packageName}`);
  }

  return path.join(PNPM_ROOT, packageDir, "node_modules", packageName);
}

function isWithinDirectory(targetPath: string, rootPath: string): boolean {
  const relativePath = path.relative(rootPath, targetPath);
  return relativePath.length > 0 && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

function vendorSourcePathToAssetPath(sourcePath: string): string | null {
  for (const vendorPackage of vendorPackages) {
    const packageRoot = vendorPackageRoots.get(vendorPackage.packageName);
    if (!packageRoot) {
      continue;
    }
    if (sourcePath === path.join(packageRoot, vendorPackage.entryRelativePath)) {
      return vendorPackage.entryAssetPath;
    }
    if (!isWithinDirectory(sourcePath, packageRoot)) {
      continue;
    }

    return `${VENDOR_MODULE_PREFIX}${packageNameToAssetSegment(vendorPackage.packageName)}/${path.relative(packageRoot, sourcePath).replaceAll(path.sep, "/")}`;
  }

  return null;
}

function sourcePathToAssetPath(sourcePath: string): string {
  if (sourcePath.startsWith(WEB_SRC_ROOT)) {
    const relativePath = path.relative(WEB_SRC_ROOT, sourcePath);
    if (relativePath === "main.ts") {
      return ENTRY_ASSET_PATH;
    }
    return `${MODULE_ASSET_PREFIX}${relativePath.replace(/\.ts$/, ".js")}`;
  }

  const vendorAssetPath = vendorSourcePathToAssetPath(sourcePath);
  if (vendorAssetPath !== null) {
    return vendorAssetPath;
  }

  throw new Error(`unmapped source asset: ${sourcePath}`);
}

function resolveVendorModulePath(pathname: string): { packageRoot: string; relativePath: string } | null {
  if (!pathname.startsWith(VENDOR_MODULE_PREFIX) || !pathname.endsWith(".js")) {
    return null;
  }

  const assetRelativePath = pathname.slice(VENDOR_MODULE_PREFIX.length);
  const separatorIndex = assetRelativePath.indexOf("/");
  if (separatorIndex < 0) {
    return null;
  }

  const packageSegment = assetRelativePath.slice(0, separatorIndex);
  const packageName = vendorAssetSegments.get(packageSegment);
  const packageRoot = packageName ? vendorPackageRoots.get(packageName) : null;
  if (!packageRoot) {
    return null;
  }

  return {
    packageRoot,
    relativePath: assetRelativePath.slice(separatorIndex + 1)
  };
}

function assetPathToVendorSourcePath(pathname: string): string | null {
  const directEntry = vendorEntryAssets.get(pathname);
  if (directEntry) {
    return directEntry;
  }
  const vendorModule = resolveVendorModulePath(pathname);
  if (vendorModule === null) {
    return null;
  }

  const resolvedPath = path.resolve(vendorModule.packageRoot, vendorModule.relativePath);
  if (!isWithinDirectory(resolvedPath, vendorModule.packageRoot) || !fs.existsSync(resolvedPath)) {
    return null;
  }

  return resolvedPath;
}

function assetPathToSourcePath(pathname: string): string | null {
  if (pathname === ENTRY_ASSET_PATH) {
    return path.join(WEB_SRC_ROOT, "main.ts");
  }

  const vendorSourcePath = assetPathToVendorSourcePath(pathname);
  if (vendorSourcePath !== null) {
    return vendorSourcePath;
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
  const vendorPackage = vendorPackages.find((entry) => entry.packageName === specifier);
  if (vendorPackage) {
    return vendorPackage.entryAssetPath;
  }
  if (specifier.startsWith(".")) {
    return sourcePathToAssetPath(resolveRelativeSourcePath(sourcePath, specifier));
  }
  return specifier;
}

function rewriteImports(code: string, sourcePath: string): string {
  return code
    .replace(/from\s+["']([^"']+)["']/g, (_match, specifier: string) => `from "${rewriteSpecifier(sourcePath, specifier)}"`)
    .replace(/import\(\s*["']([^"']+)["']\s*\)/g, (_match, specifier: string) => `import("${rewriteSpecifier(sourcePath, specifier)}")`);
}

function transpileSourceAsset(sourcePath: string): string {
  if (sourcePath.startsWith(WEB_SRC_ROOT)) {
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

  return rewriteImports(fs.readFileSync(sourcePath, "utf8"), sourcePath);
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
  const sourcePath = assetPathToSourcePath(pathname);
  if (sourcePath === null) {
    return null;
  }

  return {
    body: transpileSourceAsset(sourcePath),
    contentType: "text/javascript; charset=utf-8"
  };
}
