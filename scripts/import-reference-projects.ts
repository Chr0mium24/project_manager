import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createProject, deleteManagedProject, readProject } from "../packages/project-core/src/index.ts";

interface ReferenceProjectConfig {
  description: string;
  framework: string;
  name: string;
  referenceDir: string;
  slug: string;
  tags: string[];
}

interface ProjectAsset {
  content: string;
  fileName: string;
}

interface TransformedProject {
  assets: ProjectAsset[];
  html: string;
}

const REFERENCE_PROJECTS: readonly ReferenceProjectConfig[] = Object.freeze([
  {
    slug: "gre-flow",
    name: "GRE Flow",
    description: "Immersive GRE vocabulary trainer with AI-assisted practice and reading flow screens.",
    framework: "react-cdn",
    referenceDir: "f1646cf0601048d8b296a98d62328afa",
    tags: ["education", "language", "study"]
  },
  {
    slug: "lean-algebra-dojo",
    name: "Lean Algebra Dojo",
    description: "Lean 4 abstract algebra practice workspace with guided prompts and proof console panels.",
    framework: "tailwind-cdn",
    referenceDir: "bb3c35712be64afaa83289e138414bfb",
    tags: ["lean", "math", "education"]
  },
  {
    slug: "agent-brain-core",
    name: "Agent Brain Core",
    description: "Agent cockpit prototype for prompt composition, state tracking, and lightweight interaction flows.",
    framework: "vanilla",
    referenceDir: "dd95876a9b444ffa9ac0c956bd016856",
    tags: ["agent", "workspace", "prototype"]
  },
  {
    slug: "local-ai-assistant",
    name: "Local AI Assistant",
    description: "Minimal local AI assistant shell with conversation layout and focused utility actions.",
    framework: "vanilla",
    referenceDir: "b59f406c8c154685b51bafa46fd2bf80",
    tags: ["assistant", "chat", "local"]
  },
  {
    slug: "cec-sync-tool",
    name: "CEC Sync Tool",
    description: "CEC timing utility focused on synchronization, control status, and operator-facing feedback.",
    framework: "vanilla",
    referenceDir: "566c133b04864d95813076352f01522c",
    tags: ["timing", "tooling", "ops"]
  },
  {
    slug: "lan-clipboard",
    name: "LAN Clipboard",
    description: "LAN clipboard utility for lightweight sharing and device-to-device handoff inside a local network.",
    framework: "vanilla",
    referenceDir: "f043ddff457e48b4b1d83bd71abd3fd6",
    tags: ["clipboard", "network", "utility"]
  },
  {
    slug: "yolo-label-editor",
    name: "YOLO Label Editor",
    description: "YOLO annotation editing tool with quick label management and image-focused review workflow.",
    framework: "vanilla",
    referenceDir: "13a508b09cd2409099da1b2d36eb68fd",
    tags: ["vision", "labels", "editor"]
  },
  {
    slug: "split-bill-calculator",
    name: "Split Bill Calculator",
    description: "Expense splitting calculator for small groups with clear contribution and settlement summaries.",
    framework: "vanilla",
    referenceDir: "e6e0b8a19ca04d5bab4cdee6fa1057d3",
    tags: ["finance", "calculator", "group"]
  }
]);

const REMOVED_REFERENCE_PROJECT_SLUGS: readonly string[] = Object.freeze([
  "circuit-lab-pro",
  "experiment-image-packer",
  "mahjong-recognizer",
  "shanten-calculator"
]);

function nowIso(): string {
  return new Date().toISOString();
}

function writeTextFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function writeJson(filePath: string, value: unknown): void {
  writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeAssetContent(content: string): string {
  return `${content.replace(/[ \t]+$/gm, "").trim()}\n`;
}

function listReferenceHtmlFiles(referenceRoot: string): string[] {
  return fs.readdirSync(referenceRoot)
    .filter((fileName) => fileName.endsWith(".html"))
    .map((fileName) => path.join(referenceRoot, fileName));
}

function selectBestReferenceHtml(referenceRoot: string): string {
  const htmlFiles = listReferenceHtmlFiles(referenceRoot);
  if (htmlFiles.length === 0) {
    throw new Error(`reference project does not contain html files: ${referenceRoot}`);
  }

  return htmlFiles
    .map((filePath) => ({
      filePath,
      size: fs.statSync(filePath).size
    }))
    .sort((left, right) => right.size - left.size)[0]?.filePath ?? htmlFiles[0];
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

function transformReferenceHtml(html: string, slug: string): TransformedProject {
  const assets: ProjectAsset[] = [];
  const htmlWithStyles = replaceInlineStyles(html, slug, assets);
  const transformedHtml = replaceInlineScripts(htmlWithStyles, slug, assets);

  return {
    html: transformedHtml,
    assets
  };
}

function updateProjectMetadata(
  rootDir: string,
  config: ReferenceProjectConfig,
  updatedAt: string
): void {
  const existingProject = readProject(rootDir, config.slug);
  if (existingProject === null) {
    throw new Error(`project missing after createProject: ${config.slug}`);
  }

  writeJson(path.join(rootDir, "content-repo", "projects", config.slug, "project.json"), {
    ...existingProject,
    description: config.description,
    framework: config.framework,
    tags: config.tags,
    updatedAt
  });
}

function importReferenceProject(rootDir: string, config: ReferenceProjectConfig): void {
  const referenceRoot = path.join(rootDir, "reference", "projects", config.referenceDir);
  const sourceHtmlPath = selectBestReferenceHtml(referenceRoot);
  const sourceHtml = fs.readFileSync(sourceHtmlPath, "utf8");
  const transformedProject = transformReferenceHtml(sourceHtml, config.slug);
  const project = createProject(rootDir, {
    force: true,
    name: config.name,
    runtime: "static",
    slug: config.slug,
    visibility: "public"
  });
  const updatedAt = nowIso();
  const projectSourceRoot = path.join(rootDir, "content-repo", "projects", project.slug, "src");

  writeTextFile(path.join(projectSourceRoot, "index.html"), transformedProject.html);
  transformedProject.assets.forEach((asset) => {
    writeTextFile(path.join(projectSourceRoot, asset.fileName), asset.content);
  });
  updateProjectMetadata(rootDir, config, updatedAt);
}

function removeDeprecatedReferenceProjects(rootDir: string): void {
  REMOVED_REFERENCE_PROJECT_SLUGS.forEach((slug) => {
    deleteManagedProject(rootDir, slug);
  });
}

function main(): void {
  const rootDir = process.cwd();
  removeDeprecatedReferenceProjects(rootDir);
  REFERENCE_PROJECTS.forEach((config) => {
    importReferenceProject(rootDir, config);
    process.stdout.write(`${JSON.stringify({
      referenceDir: config.referenceDir,
      route: `/p/${config.slug}`,
      slug: config.slug
    })}\n`);
  });
}

main();
