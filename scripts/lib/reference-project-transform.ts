export interface ProjectAsset {
  content: string;
  fileName: string;
}

export interface TransformedProject {
  assets: ProjectAsset[];
  html: string;
}

const MAX_SCRIPT_LINES = 400;
const SCRIPT_BUNDLE_NAMESPACE = "__PROJECT_MANAGER_SCRIPT_BUNDLES__";

function normalizeAssetContent(content: string): string {
  return `${content.replace(/[ \t]+$/gm, "").trim()}\n`;
}

function countLines(content: string): number {
  return content.split("\n").length - 1;
}

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceInlineStyles(html: string, slug: string, assets: ProjectAsset[]): string {
  let styleIndex = 0;
  return html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_match, cssContent: string) => {
    styleIndex += 1;
    const fileName = styleIndex === 1 ? "styles.css" : `styles-${String(styleIndex)}.css`;
    assets.push({
      fileName,
      content: normalizeAssetContent(cssContent)
    });
    return `<link rel="stylesheet" href="/p/${slug}/${fileName}">`;
  });
}

function replaceInlineScripts(html: string, slug: string, assets: ProjectAsset[]): string {
  let scriptIndex = 0;
  return html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attributes: string, scriptContent: string) => {
    if (/\bsrc\s*=/.test(attributes)) {
      return match;
    }

    scriptIndex += 1;
    const typeAttribute = attributes.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? null;
    const extension = typeAttribute !== null && typeAttribute.includes("babel") ? "jsx" : "js";
    const fileName = scriptIndex === 1 ? `script.${extension}` : `script-${String(scriptIndex)}.${extension}`;
    assets.push({
      fileName,
      content: normalizeAssetContent(scriptContent)
    });
    const normalizedAttributes = attributes.trim();
    return normalizedAttributes.length === 0
      ? `<script src="/p/${slug}/${fileName}"></script>`
      : `<script ${normalizedAttributes} src="/p/${slug}/${fileName}"></script>`;
  });
}

function buildScriptPayloadContent(bundleId: string, content: string): string {
  return [
    `window.${SCRIPT_BUNDLE_NAMESPACE} = window.${SCRIPT_BUNDLE_NAMESPACE} || {};`,
    `window.${SCRIPT_BUNDLE_NAMESPACE}[${JSON.stringify(bundleId)}] = ${JSON.stringify(content)};`
  ].join("\n") + "\n";
}

function buildScriptRunnerContent(bundleId: string): string {
  return [
    `const bundleStore = window.${SCRIPT_BUNDLE_NAMESPACE} || {};`,
    `const bundleSource = bundleStore[${JSON.stringify(bundleId)}] || "";`,
    "if (bundleSource) {",
    "  window.eval(bundleSource);",
    `  delete bundleStore[${JSON.stringify(bundleId)}];`,
    "}"
  ].join("\n") + "\n";
}

function replaceScriptReference(
  html: string,
  slug: string,
  originalFileName: string,
  replacement: string
): string {
  const scriptTagPattern = new RegExp(
    `<script\\b([^>]*)\\bsrc=["']/p/${escapeRegexLiteral(slug)}/${escapeRegexLiteral(originalFileName)}["']([^>]*)></script>`,
    "i"
  );
  return html.replace(scriptTagPattern, replacement);
}

function bundleOversizedScripts(project: TransformedProject, slug: string): TransformedProject {
  const nextAssets: ProjectAsset[] = [];
  let nextHtml = project.html;

  project.assets.forEach((asset) => {
    if (!asset.fileName.endsWith(".js") || countLines(asset.content) <= MAX_SCRIPT_LINES) {
      nextAssets.push(asset);
      return;
    }

    const bundleId = `${slug}:${asset.fileName}`;
    const payloadFileName = asset.fileName.replace(/\.js$/, "-payload.js");

    nextAssets.push({
      fileName: payloadFileName,
      content: buildScriptPayloadContent(bundleId, asset.content)
    });
    nextAssets.push({
      fileName: asset.fileName,
      content: buildScriptRunnerContent(bundleId)
    });

    nextHtml = replaceScriptReference(
      nextHtml,
      slug,
      asset.fileName,
      `<script src="/p/${slug}/${payloadFileName}"></script>\n    <script src="/p/${slug}/${asset.fileName}"></script>`
    );
  });

  return {
    html: nextHtml,
    assets: nextAssets
  };
}

export function transformReferenceHtml(html: string, slug: string): TransformedProject {
  const assets: ProjectAsset[] = [];
  const htmlWithStyles = replaceInlineStyles(html, slug, assets);
  const transformedHtml = replaceInlineScripts(htmlWithStyles, slug, assets);

  return bundleOversizedScripts({
    assets,
    html: transformedHtml
  }, slug);
}
