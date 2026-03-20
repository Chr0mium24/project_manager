import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createProject, readProject } from "../packages/project-core/src/index.ts";
import { transformReferenceHtml } from "./lib/reference-project-transform.ts";

interface ReferenceProjectConfig {
  description: string;
  framework: string;
  name: string;
  referenceDir: string;
  slug: string;
  tags: string[];
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
    slug: "lcapy-pyodide",
    name: "Lcapy Pyodide",
    description: "Browser-based Lcapy and Pyodide circuit worksheet for symbolic analysis and quick experiments.",
    framework: "pyodide",
    referenceDir: "14ed03867fa442eb8c70de47db67108a",
    tags: ["circuits", "pyodide", "analysis"]
  },
  {
    slug: "bag-formula-calculator",
    name: "Bag Formula Calculator",
    description: "Realtime packaging formula calculator for bag sizing, material inputs, and manufacturing estimates.",
    framework: "vanilla",
    referenceDir: "2516dcb291ad41569c23b5a6cc57425e",
    tags: ["calculator", "manufacturing", "packaging"]
  },
  {
    slug: "textual-scaling-demo",
    name: "Textual Scaling Demo",
    description: "Interactive text resolution scaling demo for tuning layout density, type size, and readability.",
    framework: "vue-cdn",
    referenceDir: "2842ae93589e4cbda1828d16aaf1ac0d",
    tags: ["typography", "ui", "demo"]
  },
  {
    slug: "shanten-calculator",
    name: "Shanten Calculator",
    description: "Mahjong shanten calculator focused on hand evaluation, tile state inspection, and discard planning.",
    framework: "vanilla",
    referenceDir: "330efde1458f4b4b9777a2f694aad022",
    tags: ["mahjong", "calculator", "game"]
  },
  {
    slug: "chinese-text-analyzer",
    name: "Chinese Text Analyzer",
    description: "Chinese text comparison workbench with feature extraction, chart-based summaries, and distribution views.",
    framework: "chartjs-cdn",
    referenceDir: "38784b7751224d898cd23cb00665cfc0",
    tags: ["text", "analysis", "charts"]
  },
  {
    slug: "pdf-split-tool",
    name: "PDF Split Tool",
    description: "Client-side PDF preview and custom split utility for slicing documents into targeted output files.",
    framework: "pdf-lib-cdn",
    referenceDir: "43c7d128bf4d47c0ba9648b059d2adb2",
    tags: ["pdf", "documents", "utility"]
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
    slug: "opencv-color-range-selector",
    name: "OpenCV Color Range Selector",
    description: "OpenCV-based color range selector for HSV and LAB tuning with image-backed preview controls.",
    framework: "opencv-cdn",
    referenceDir: "68187d52bc8a4ba2b42105e2c9874ccb",
    tags: ["opencv", "vision", "color"]
  },
  {
    slug: "mahjong-recognizer",
    name: "Mahjong Recognizer",
    description: "Mahjong screenshot recognizer with ONNX-based tile detection and integrated shanten analysis.",
    framework: "onnx-cdn",
    referenceDir: "981a35ec3a03489eb22b0850ebb57dd2",
    tags: ["mahjong", "onnx", "vision"]
  },
  {
    slug: "circuit-lab-pro",
    name: "Circuit Lab Pro",
    description: "Circuit experiment assistant with persistent local state, guided workflows, and export tooling.",
    framework: "vue-cdn",
    referenceDir: "a357416320734c9a9a68203637c43235",
    tags: ["circuits", "lab", "workflow"]
  },
  {
    slug: "yolo-web-detector",
    name: "YOLO Web Detector",
    description: "Browser YOLOv8 ONNX detector for realtime inference demos and quick model checks in the page.",
    framework: "onnx-cdn",
    referenceDir: "a3f6fe6162464f8797a53d45f183b470",
    tags: ["yolo", "onnx", "vision"]
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
  },
  {
    slug: "image-to-gif-tool",
    name: "Image To GIF Tool",
    description: "Image-to-GIF converter for assembling still images into animated exports directly in the browser.",
    framework: "vanilla",
    referenceDir: "b17bcc99851d4c168cc31c16b5610c79",
    tags: ["image", "gif", "converter"]
  },
  {
    slug: "course-selection-helper",
    name: "Course Selection Helper",
    description: "Course planning interface for comparing options, tracking constraints, and assembling schedules.",
    framework: "vanilla",
    referenceDir: "f63a62a250024ecdbf88cf2baba4e6d0",
    tags: ["education", "planning", "schedule"]
  },
  {
    slug: "experiment-image-packer",
    name: "Experiment Image Packer",
    description: "Experiment image upload and ZIP packaging workflow for collecting, reviewing, and exporting batches.",
    framework: "vanilla",
    referenceDir: "fc1670b3052847a5aa800cea4aa02e39",
    tags: ["images", "zip", "workflow"]
  }
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

function main(): void {
  const rootDir = process.cwd();
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
