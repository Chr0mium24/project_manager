import fs from "node:fs";
import path from "node:path";
import { walkFiles } from "./fs-utils.mjs";

const codeExtensions = [".ts", ".tsx", ".js", ".mjs", ".mts", ".cts"];
const importRe = /\b(?:import|export)\b[\s\S]*?\bfrom\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;

function getModuleInfo(relativePath) {
  const parts = relativePath.split(path.sep).join("/").split("/");
  const group = parts[0];
  const name = parts[1];

  if (group === "apps" && name) {
    return { kind: "app", name };
  }

  if (group === "packages" && name) {
    return { kind: "package", name };
  }

  if (group === "scripts") {
    return { kind: "script", name: "scripts" };
  }

  return { kind: "other", name: null };
}

function isCodeFile(filePath) {
  return codeExtensions.some((extension) => filePath.endsWith(extension));
}

function extractImportSpecifiers(sourceText) {
  const matches = [];
  let match = importRe.exec(sourceText);

  while (match !== null) {
    const specifier = match[1] ?? match[2];
    if (specifier) {
      matches.push(specifier);
    }
    match = importRe.exec(sourceText);
  }

  return matches;
}

function resolveRelativeImport(rootDir, sourceFilePath, specifier) {
  const sourceDir = path.dirname(sourceFilePath);
  const unresolved = path.resolve(sourceDir, specifier);
  const candidates = [
    unresolved,
    ...codeExtensions.map((extension) => `${unresolved}${extension}`),
    ...codeExtensions.map((extension) => path.join(unresolved, `index${extension}`))
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.relative(rootDir, candidate).split(path.sep).join("/");
    }
  }

  return null;
}

function isPublicModuleTarget(targetPath) {
  return (
    /^packages\/[^/]+\/src\/index\.(?:ts|tsx|js|mjs|mts|cts)$/.test(targetPath) ||
    /^packages\/[^/]+\/src\/public\//.test(targetPath) ||
    /^apps\/[^/]+\/src\/index\.(?:ts|tsx|js|mjs|mts|cts)$/.test(targetPath)
  );
}

function listBoundaryFiles(rootDir) {
  return walkFiles(rootDir, {
    includeExtensions: new Set(codeExtensions)
  }).filter((filePath) => {
    const relativePath = path.relative(rootDir, filePath).split(path.sep).join("/");
    return /^(apps|packages|scripts)\//.test(relativePath);
  });
}

function validateCrossModuleImport(sourceRelativePath, sourceModule, targetRelativePath) {
  const targetModule = getModuleInfo(targetRelativePath);
  if (targetModule.kind === "other") {
    return null;
  }

  const sameModule =
    sourceModule.kind === targetModule.kind && sourceModule.name === targetModule.name;
  if (sameModule) {
    return null;
  }

  if (sourceModule.kind === "package" && targetModule.kind === "app") {
    return `${sourceRelativePath}: packages must not import apps (${targetRelativePath})`;
  }

  if (sourceModule.kind === "script" && targetModule.kind === "app") {
    return `${sourceRelativePath}: scripts must not import apps (${targetRelativePath})`;
  }

  if (!isPublicModuleTarget(targetRelativePath)) {
    return `${sourceRelativePath}: cross-module import must use a public entry (${targetRelativePath})`;
  }

  return null;
}

function validateImportSpecifier(context, specifier) {
  if (specifier.startsWith("@project-manager/") || !specifier.startsWith(".")) {
    return [];
  }

  const targetRelativePath = resolveRelativeImport(context.rootDir, context.filePath, specifier);
  if (targetRelativePath === null) {
    return [`${context.sourceRelativePath}: cannot resolve import ${specifier}`];
  }

  const failure = validateCrossModuleImport(
    context.sourceRelativePath,
    context.sourceModule,
    targetRelativePath
  );
  return failure === null ? [] : [failure];
}

function validateFileImports(rootDir, filePath) {
  const context = {
    rootDir,
    filePath,
    sourceRelativePath: path.relative(rootDir, filePath).split(path.sep).join("/"),
    sourceModule: null
  };
  context.sourceModule = getModuleInfo(context.sourceRelativePath);
  const sourceText = fs.readFileSync(filePath, "utf8");
  const specifiers = extractImportSpecifiers(sourceText);
  const failures = [];

  for (const specifier of specifiers) {
    failures.push(...validateImportSpecifier(context, specifier));
  }

  return failures;
}

export function validateModuleBoundaries(rootDir) {
  const failures = [];
  const files = listBoundaryFiles(rootDir);

  for (const filePath of files) {
    failures.push(...validateFileImports(rootDir, filePath));
  }

  return failures;
}
